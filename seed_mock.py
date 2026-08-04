#!/usr/bin/env python3
"""
Seed script for yiyu-platform.
Reads users.json and events.json, then imports them into the platform via API.

Usage:
    # Make sure the backend is running first (python main.py or run.bat)
    python seed.py                    # default: http://localhost:8000
    python seed.py --base-url http://your-server:8000
    python seed.py --reset            # clear existing data first
"""

import json
import sys
import argparse
import requests
from pathlib import Path

DEFAULT_BASE_URL = "http://localhost:8000/api/v1"
DATA_DIR = Path(__file__).parent


def load_json(filename: str) -> list:
    filepath = DATA_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def reset_data(base_url: str):
    """Clear existing events and users (except built-in ones)."""
    print("⚠️  Resetting data...")
    # Login as admin
    resp = requests.post(f"{base_url}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if resp.status_code != 200:
        print("❌ Cannot login as admin. Is the backend running?")
        sys.exit(1)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Delete all events
    events_resp = requests.get(f"{base_url}/events", headers=headers, params={"page_size": 200})
    if events_resp.status_code == 200:
        events = events_resp.json().get("items", [])
        for event in events:
            requests.delete(f"{base_url}/events/{event['id']}", headers=headers)
        print(f"  Deleted {len(events)} events")

    print("✅ Data reset complete\n")
    return token


def seed_users(base_url: str, users: list) -> dict:
    """Register users and return {username: {token, user_id}} map."""
    print("📦 Seeding users...")
    user_map = {}
    errors = 0

    for user in users:
        try:
            # Try to login first (user may already exist from seed data)
            resp = requests.post(f"{base_url}/auth/login", json={
                "username": user["username"],
                "password": user["password"]
            })
            if resp.status_code == 200:
                data = resp.json()
                user_map[user["username"]] = {
                    "token": data["access_token"],
                    "user_id": data["user"]["id"]
                }
                continue

            # Register new user
            resp = requests.post(f"{base_url}/auth/register", json={
                "username": user["username"],
                "email": user["email"],
                "password": user["password"],
                "display_name": user.get("display_name", user["username"]),
                "tags": user.get("tags", [])
            })
            if resp.status_code in (200, 201):
                data = resp.json()
                user_map[user["username"]] = {
                    "token": data["access_token"],
                    "user_id": data["user"]["id"]
                }
                print(f"  ✅ {user['display_name']} (@{user['username']})")
            else:
                print(f"  ⚠️ {user['username']}: {resp.status_code} {resp.text[:80]}")
                errors += 1
        except requests.ConnectionError:
            print("❌ Cannot connect to backend. Is it running?")
            sys.exit(1)

    print(f"  → {len(user_map)} users ready, {errors} errors\n")
    return user_map


def seed_events(base_url: str, events: list, user_map: dict):
    """Create events using each user's token."""
    print("📦 Seeding events...")
    created = 0
    errors = 0

    for event in events:
        organizer = event.get("organizer_username")
        if organizer not in user_map:
            print(f"  ⚠️ Skip '{event['title']}': organizer '{organizer}' not found")
            errors += 1
            continue

        token = user_map[organizer]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "title": event["title"],
            "description": event["description"],
            "type": event["type"],
            "category": event["category"],
            "start_time": event["start_time"],
            "status": "published",
            "tags": event.get("tags", []),
        }
        if event.get("end_time"):
            payload["end_time"] = event["end_time"]
        if event.get("location_name"):
            payload["location_name"] = event["location_name"]
        if event.get("latitude") and event.get("longitude"):
            payload["latitude"] = event["latitude"]
            payload["longitude"] = event["longitude"]
        if event.get("max_participants"):
            payload["max_participants"] = event["max_participants"]
        if event.get("price", 0) > 0:
            payload["price"] = event["price"]

        try:
            resp = requests.post(f"{base_url}/events", json=payload, headers=headers)
            if resp.status_code in (200, 201):
                created += 1
                print(f"  ✅ {event['title']}")
            else:
                print(f"  ❌ {event['title']}: {resp.status_code} {resp.text[:80]}")
                errors += 1
        except requests.ConnectionError:
            print("❌ Connection lost")
            sys.exit(1)

    print(f"  → {created} events created, {errors} errors\n")


def simulate_participants(base_url: str, events: list, user_map: dict):
    """Simulate some users registering for events (partial fill)."""
    print("📦 Simulating registrations...")
    registered = 0

    # Get event IDs
    admin_user = next((u for u in user_map if user_map[u].get("token")), None)
    if not admin_user:
        print("  ⚠️ No users available for registration")
        return

    headers = {"Authorization": f"Bearer {user_map[admin_user]['token']}"}
    events_resp = requests.get(f"{base_url}/events", headers=headers, params={"status": "published", "page_size": 200})
    if events_resp.status_code != 200:
        return

    all_events = events_resp.json().get("items", [])
    all_users = [u for u in user_map.keys() if u != admin_user]

    for evt in all_events:
        # Find matching mock data to get target participant count
        mock = next((e for e in events if e["title"] == evt["title"]), None)
        if not mock:
            continue

        target = mock.get("current_participants", 0)
        current = evt.get("current_participants", 0)

        for username in all_users[:max(0, target - current)]:
            token = user_map[username]["token"]
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.post(
                f"{base_url}/events/{evt['id']}/register",
                headers=headers
            )
            if resp.status_code in (200, 201):
                registered += 1

    print(f"  → {registered} registrations simulated\n")


def main():
    parser = argparse.ArgumentParser(description="Seed yiyu-platform with mock data")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--reset", action="store_true", help="Clear existing data first")
    parser.add_argument("--no-participants", action="store_true", help="Skip registration simulation")
    args = parser.parse_args()

    print(f"\n🚀 yiyu-platform Mock Data Seeder")
    print(f"   API: {args.base_url}\n")

    users = load_json("users.json")
    events = load_json("events.json")
    print(f"   Found {len(users)} users, {len(events)} events\n")

    if args.reset:
        reset_data(args.base_url)

    # Step 1: Create users
    user_map = seed_users(args.base_url, users)

    if not user_map:
        print("❌ No users created. Aborting.")
        sys.exit(1)

    # Step 2: Create events
    seed_events(args.base_url, events, user_map)

    # Step 3: Simulate registrations
    if not args.no_participants:
        simulate_participants(args.base_url, events, user_map)

    # Step 4: Seed achievements and points
    if not args.no_participants:
        seed_achievements(args.base_url, user_map)

    print("🎉 Seed complete!")
    print(f"\n📋 Quick test accounts:")
    print(f"   Admin: admin / admin123")
    for u in list(user_map.keys())[:5]:
        print(f"   User:  {u} / user123")
    print(f"\n   Open http://localhost:5173 in browser to test!\n")


if __name__ == "__main__":
    main()
ACHIEVEMENT_DEFINITIONS = [
    {"name": "首次活动", "description": "创建或参加第一个活动", "icon": "🎯", "points": 100},
    {"name": "活动达人", "description": "累计参加5个活动", "icon": "⭐", "points": 500},
    {"name": "组织能手", "description": "发布3个活动", "icon": "🏅", "points": 300},
    {"name": "社交之星", "description": "报名参加1个活动", "icon": "🌟", "points": 50},
    {"name": "摄影爱好者", "description": "上传1张活动照片", "icon": "📸", "points": 100},
    {"name": "评论家", "description": "发表1条活动评论", "icon": "💬", "points": 80},
    {"name": "早起鸟", "description": "提前3天报名活动", "icon": "🐦", "points": 200},
    {"name": "全勤王", "description": "连续参加3个活动", "icon": "👑", "points": 1000},
]


def seed_achievements(base_url: str, user_map: dict):
    """Seed achievements and points for users."""
    print("📦 Seeding achievements and points...")

    points_actions = [
        ("hiker01", 1280, "参加徒步活动 + 发布活动"),
        ("event_master", 2100, "组织多个活动获得积分"),
        ("climber", 2450, "多次户外活动获得积分"),
        ("nature_lover", 980, "参加公益活动获得积分"),
        ("photo_fan", 750, "上传照片获得积分"),
        ("music_lover", 500, "参加音乐活动获得积分"),
        ("bookworm", 300, "参加读书分享会获得积分"),
        ("runner", 600, "参加马拉松获得积分"),
        ("tech_geek", 400, "参加技术讲座获得积分"),
        ("foodie", 350, "参加美食活动获得积分"),
    ]

    seeded = 0
    for username, points, desc in points_actions:
        if username not in user_map:
            continue
        token = user_map[username]["token"]
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "points": points,
            "description": f"[模拟] {desc}",
            "related_event_id": None,
        }
        try:
            resp = requests.post(f"{base_url}/achievements/points", json=payload, headers=headers)
            if resp.status_code in (200, 201):
                seeded += 1
        except requests.ConnectionError:
            pass

    print(f"  → {seeded} users received points ({len(points_actions)} configured)\n")