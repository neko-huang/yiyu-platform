import { Link } from 'react-router-dom';
import type { Event } from '../types';

interface EventCardProps {
  event: Event;
}

const categoryColors: Record<string, string> = {
  户外: 'bg-green-100 text-green-700',
  音乐: 'bg-purple-100 text-purple-700',
  读书: 'bg-amber-100 text-amber-700',
  运动: 'bg-red-100 text-red-700',
  讲座: 'bg-blue-100 text-blue-700',
  科技: 'bg-indigo-100 text-indigo-700',
  美食: 'bg-orange-100 text-orange-700',
  艺术: 'bg-pink-100 text-pink-700',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export default function EventCard({ event }: EventCardProps) {
  const categoryColor = categoryColors[event.category] || 'bg-gray-100 text-gray-700';
  const isFull = event.current_participants >= event.max_participants;
  const progress = event.max_participants > 0 ? (event.current_participants / event.max_participants) * 100 : 0;

  return (
    <Link
      to={`/events/${event.id}`}
      className="card overflow-hidden hover:shadow-lg transition-shadow duration-200 group"
    >
      {/* Cover image / placeholder */}
      <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-700 relative overflow-hidden">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white text-4xl font-bold opacity-50">
              {event.category}
            </span>
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="tag bg-white/90 text-gray-700 backdrop-blur-sm">
            {event.type === 'offline' ? '线下' : event.type === 'online' ? '线上' : '混合'}
          </span>
          <span className={`tag ${categoryColor}`}>
            {event.category}
          </span>
        </div>
        {/* Price badge */}
        <div className="absolute top-3 right-3">
          <span className="tag bg-white/90 text-gray-800 backdrop-blur-sm font-semibold">
            {event.price === 0 ? '免费' : `¥${event.price}`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(event.start_time)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-1">{event.location_name}</span>
          </div>
        </div>

        {/* Participants progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>报名人数</span>
            <span className={isFull ? 'text-red-500 font-medium' : ''}>
              {event.current_participants} / {event.max_participants}
              {isFull && ' · 已满'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${isFull ? 'bg-red-400' : 'bg-primary-500'}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag bg-gray-100 text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
