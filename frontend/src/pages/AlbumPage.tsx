import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Album, AlbumPhoto } from '../types';
import { getAlbums, addAlbumPhoto, uploadImage } from '../api/client';

// ===== 模拟数据 =====
const mockAlbums: Album[] = [
  {
    id: 1,
    event_id: 1,
    user_id: 1,
    title: '活动精彩瞬间',
    description: '记录本次活动的精彩瞬间',
    created_at: '2026-08-10T10:00:00',
    photos: [
      { id: 1, album_id: 1, user_id: 1, image_url: '', caption: '开幕式现场', ai_caption: ' participants gathered at the opening ceremony', sort_order: 1, created_at: '2026-08-10T10:05:00' },
      { id: 2, album_id: 1, user_id: 2, image_url: '', caption: '团队协作环节', ai_caption: null, sort_order: 2, created_at: '2026-08-10T11:30:00' },
      { id: 3, album_id: 1, user_id: 1, image_url: '', caption: '合影留念', ai_caption: null, sort_order: 3, created_at: '2026-08-10T16:00:00' },
      { id: 4, album_id: 1, user_id: 3, image_url: '', caption: '山间美景', ai_caption: null, sort_order: 4, created_at: '2026-08-10T12:00:00' },
      { id: 5, album_id: 1, user_id: 2, image_url: '', caption: '下午茶时光', ai_caption: null, sort_order: 5, created_at: '2026-08-10T14:30:00' },
      { id: 6, album_id: 1, user_id: 1, image_url: '', caption: '颁奖时刻', ai_caption: null, sort_order: 6, created_at: '2026-08-10T15:45:00' },
    ],
  },
];

const placeholderColors = [
  'from-blue-400 to-indigo-500',
  'from-green-400 to-teal-500',
  'from-orange-400 to-red-500',
  'from-purple-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-yellow-400 to-orange-500',
];

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<AlbumPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const eventId = Number(id);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlbums(eventId);
      setAlbums(data.items);
    } catch {
      setAlbums(mockAlbums);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const albumId = albums[0]?.id || 1;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadRes = await uploadImage(file);
        await addAlbumPhoto(albumId, { image_url: uploadRes.url, caption: file.name });
      }
      await fetchAlbums();
    } catch {
      // Mock: add placeholder photos
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const newPhoto: AlbumPhoto = {
          id: Date.now() + i,
          album_id: albums[0]?.id || 1,
          user_id: 1,
          image_url: '',
          caption: file.name,
          ai_caption: null,
          sort_order: 99,
          created_at: new Date().toISOString(),
        };
        setAlbums((prev) =>
          prev.map((a) => (a.id === (albums[0]?.id || 1) ? { ...a, photos: [...a.photos, newPhoto] } : a))
        );
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allPhotos = albums.flatMap((a) => a.photos);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500" aria-label="面包屑导航">
        <Link to="/" className="hover:text-primary-600">首页</Link>
        <span className="mx-2">/</span>
        <Link to={`/events/${id}`} className="hover:text-primary-600">活动详情</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">活动相册</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📸 活动相册</h1>
          <p className="text-gray-500 text-sm mt-1">共 {allPhotos.length} 张照片</p>
        </div>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer flex items-center gap-2">
            <span>📷 拍照</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <label className="btn-primary cursor-pointer flex items-center gap-2">
            <span>{uploading ? '上传中...' : '🖼️ 从相册选择'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Photo Grid */}
      {allPhotos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📷</div>
          <p className="text-gray-500 text-lg mb-2">还没有照片</p>
          <p className="text-gray-400 text-sm">上传第一张照片，记录活动精彩瞬间吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all"
              onClick={() => setSelectedPhoto(photo)}
            >
              {photo.image_url ? (
                <img
                  src={photo.image_url}
                  alt={photo.caption || '照片'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${placeholderColors[idx % placeholderColors.length]} flex items-center justify-center`}>
                  <span className="text-white text-4xl opacity-60">📷</span>
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium truncate">{photo.caption || '未命名'}</p>
                  <p className="text-white/70 text-xs">{new Date(photo.created_at).toLocaleDateString('zh-CN')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-2xl"
              aria-label="关闭"
            >
              ✕
            </button>
            {selectedPhoto.image_url ? (
              <img
                src={selectedPhoto.image_url}
                alt={selectedPhoto.caption || '照片'}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="w-full aspect-video bg-gradient-to-br from-primary-400 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-8xl opacity-40">📷</span>
              </div>
            )}
            {selectedPhoto.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
                <p className="text-white font-medium">{selectedPhoto.caption}</p>
                {selectedPhoto.ai_caption && (
                  <p className="text-white/70 text-sm mt-1">AI: {selectedPhoto.ai_caption}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
