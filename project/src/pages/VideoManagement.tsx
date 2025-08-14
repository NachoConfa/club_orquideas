import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Edit, Save, X, Plus, Upload, Trash2, Eye, EyeOff } from 'lucide-react';

interface VideoManagementProps {
  onBack: () => void;
  user: { name: string; email: string } | null;
}

interface Video {
  id: number;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  category: string;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
  instructor: string;
  views: number;
  isActive: boolean;
  videoUrl?: string;
  createdAt: string;
}

const VideoManagement: React.FC<VideoManagementProps> = ({ onBack, user }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Verificar si el usuario es admin
  const isAdmin = user?.email === 'NachoGemerXD@hotmail.com';

  useEffect(() => {
    if (isAdmin) {
      // Cargar videos desde localStorage o usar videos por defecto
      const savedVideos = localStorage.getItem('orchid-premium-videos');
      if (savedVideos) {
        setVideos(JSON.parse(savedVideos));
      } else {
        // Videos por defecto
        const defaultVideos: Video[] = [
          {
            id: 1,
            title: "Técnicas Avanzadas de Propagación de Orquídeas",
            description: "Aprende los secretos profesionales para multiplicar tus orquídeas con técnicas de división, keikis y cultivo in vitro.",
            duration: "45:30",
            thumbnail: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500",
            category: "Propagación",
            difficulty: "Avanzado",
            instructor: "Dr. María González",
            views: 1250,
            isActive: true,
            videoUrl: "https://example.com/video1.mp4",
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            title: "Diagnóstico y Tratamiento de Enfermedades",
            description: "Identifica y trata las enfermedades más comunes en orquídeas. Desde hongos hasta virus, aprende a salvar tus plantas.",
            duration: "38:15",
            thumbnail: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=500",
            category: "Salud",
            difficulty: "Intermedio",
            instructor: "Prof. Carlos Mendoza",
            views: 980,
            isActive: true,
            videoUrl: "https://example.com/video2.mp4",
            createdAt: new Date().toISOString()
          },
          {
            id: 3,
            title: "Orquídeas Raras: Cultivo de Especies Exóticas",
            description: "Descubre cómo cultivar las orquídeas más raras y exóticas del mundo. Técnicas especializadas para coleccionistas.",
            duration: "52:20",
            thumbnail: "https://images.pexels.com/photos/1408967/pexels-photo-1408967.jpeg?auto=compress&cs=tinysrgb&w=500",
            category: "Especies Raras",
            difficulty: "Avanzado",
            instructor: "Dra. Ana Rodríguez",
            views: 756,
            isActive: true,
            videoUrl: "https://example.com/video3.mp4",
            createdAt: new Date().toISOString()
          },
          {
            id: 4,
            title: "Hibridación: Creando Nuevas Variedades",
            description: "Aprende el arte de la hibridación para crear tus propias variedades únicas de orquídeas.",
            duration: "41:45",
            thumbnail: "https://images.pexels.com/photos/68507/spring-flowers-flowers-collage-floral-68507.jpeg?auto=compress&cs=tinysrgb&w=500",
            category: "Hibridación",
            difficulty: "Avanzado",
            instructor: "Ing. Roberto Silva",
            views: 623,
            isActive: true,
            videoUrl: "https://example.com/video4.mp4",
            createdAt: new Date().toISOString()
          },
          {
            id: 5,
            title: "Sistemas de Riego Automatizado",
            description: "Instala y configura sistemas de riego automático para mantener tus orquídeas perfectamente hidratadas.",
            duration: "29:30",
            thumbnail: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500",
            category: "Tecnología",
            difficulty: "Intermedio",
            instructor: "Ing. Laura Pérez",
            views: 1100,
            isActive: true,
            videoUrl: "https://example.com/video5.mp4",
            createdAt: new Date().toISOString()
          },
          {
            id: 6,
            title: "Orquídeas en Invernadero: Diseño y Manejo",
            description: "Todo lo que necesitas saber para diseñar y manejar un invernadero profesional para orquídeas.",
            duration: "56:10",
            thumbnail: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=500",
            category: "Invernaderos",
            difficulty: "Avanzado",
            instructor: "Arq. Miguel Torres",
            views: 890,
            isActive: true,
            videoUrl: "https://example.com/video6.mp4",
            createdAt: new Date().toISOString()
          }
        ];
        
        setVideos(defaultVideos);
        localStorage.setItem('orchid-premium-videos', JSON.stringify(defaultVideos));
      }
    }
  }, [isAdmin]);

  const handleCreateNewVideo = () => {
    const newVideo: Video = {
      id: Math.max(...videos.map(v => v.id), 0) + 1,
      title: 'Nuevo Video Premium',
      description: 'Descripción del nuevo video...',
      duration: '00:00',
      thumbnail: 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500',
      category: 'General',
      difficulty: 'Principiante',
      instructor: 'Instructor',
      views: 0,
      isActive: true,
      videoUrl: '',
      createdAt: new Date().toISOString()
    };
    
    setEditingVideo(newVideo);
    setIsCreatingNew(true);
  };

  const handleSaveVideo = (updatedVideo: Video) => {
    let updatedVideos;
    
    if (isCreatingNew) {
      // Agregar nuevo video
      updatedVideos = [...videos, updatedVideo];
      setIsCreatingNew(false);
    } else {
      // Actualizar video existente
      updatedVideos = videos.map(v => 
        v.id === updatedVideo.id ? updatedVideo : v
      );
    }
    
    setVideos(updatedVideos);
    localStorage.setItem('orchid-premium-videos', JSON.stringify(updatedVideos));
    setEditingVideo(null);
    
    alert(isCreatingNew ? '✅ Video creado correctamente' : '✅ Video actualizado correctamente');
  };

  const handleDeleteVideo = (videoId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este video?')) {
      const updatedVideos = videos.filter(v => v.id !== videoId);
      setVideos(updatedVideos);
      localStorage.setItem('orchid-premium-videos', JSON.stringify(updatedVideos));
      alert('✅ Video eliminado correctamente');
    }
  };

  const handleCancelEdit = () => {
    setEditingVideo(null);
    setIsCreatingNew(false);
  };

  const getFilteredVideos = () => {
    return videos.filter(video => {
      const matchesSearch = searchQuery === '' || 
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.instructor.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === '' || video.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  const categories = [...new Set(videos.map(v => v.category))];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Principiante': return 'bg-green-100 text-green-800';
      case 'Intermedio': return 'bg-yellow-100 text-yellow-800';
      case 'Avanzado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Requerido</h2>
          <p className="text-gray-600 mb-6">Debes iniciar sesión para acceder a la administración.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600 mb-6">No tienes permisos para administrar videos.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center mb-8">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full mr-4">
          <Play className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Administración de Videos Premium</h2>
          <p className="text-gray-600">Gestiona el contenido exclusivo para suscriptores</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <button
          onClick={handleCreateNewVideo}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Agregar Video</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">Todas las categorías</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Formulario de Nuevo Video */}
      {isCreatingNew && editingVideo && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Crear Nuevo Video
          </h3>
          <EditVideoForm
            video={editingVideo}
            onSave={handleSaveVideo}
            onCancel={handleCancelEdit}
            isCreating={true}
          />
        </div>
      )}

      {/* Lista de Videos */}
      <div className="space-y-4">
        {getFilteredVideos().map((video) => (
          <div key={video.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            {editingVideo?.id === video.id && !isCreatingNew ? (
              <EditVideoForm
                video={editingVideo}
                onSave={handleSaveVideo}
                onCancel={handleCancelEdit}
                isCreating={false}
              />
            ) : (
              <VideoRow
                video={video}
                onEdit={() => setEditingVideo(video)}
                onDelete={() => handleDeleteVideo(video.id)}
                getDifficultyColor={getDifficultyColor}
              />
            )}
          </div>
        ))}
      </div>

      {getFilteredVideos().length === 0 && (
        <div className="text-center py-12">
          <Play className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron videos</h3>
          <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
};

interface VideoRowProps {
  video: Video;
  onEdit: () => void;
  onDelete: () => void;
  getDifficultyColor: (difficulty: string) => string;
}

const VideoRow: React.FC<VideoRowProps> = ({ video, onEdit, onDelete, getDifficultyColor }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-24 h-16 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg">
            <Play className="h-6 w-6 text-white" />
          </div>
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
            {video.duration}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-800">{video.title}</h3>
            {video.isActive ? (
              <Eye className="h-4 w-4 text-green-500" title="Activo" />
            ) : (
              <EyeOff className="h-4 w-4 text-red-500" title="Inactivo" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{video.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{video.category}</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(video.difficulty)}`}>
              {video.difficulty}
            </span>
            <span>Por {video.instructor}</span>
            <span>{video.views.toLocaleString()} vistas</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onEdit}
          className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
          title="Editar video"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
          title="Eliminar video"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

interface EditVideoFormProps {
  video: Video;
  onSave: (video: Video) => void;
  onCancel: () => void;
  isCreating: boolean;
}

const EditVideoForm: React.FC<EditVideoFormProps> = ({ video, onSave, onCancel, isCreating }) => {
  const [formData, setFormData] = useState({
    title: video.title,
    description: video.description,
    duration: video.duration,
    thumbnail: video.thumbnail,
    category: video.category,
    difficulty: video.difficulty,
    instructor: video.instructor,
    videoUrl: video.videoUrl || '',
    isActive: video.isActive
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedVideo: Video = {
      ...video,
      title: formData.title,
      description: formData.description,
      duration: formData.duration,
      thumbnail: formData.thumbnail,
      category: formData.category,
      difficulty: formData.difficulty as 'Principiante' | 'Intermedio' | 'Avanzado',
      instructor: formData.instructor,
      videoUrl: formData.videoUrl,
      isActive: formData.isActive
    };

    onSave(updatedVideo);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título del video:
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción:
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duración (mm:ss):
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="45:30"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría:
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dificultad:
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="Principiante">Principiante</option>
            <option value="Intermedio">Intermedio</option>
            <option value="Avanzado">Avanzado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instructor:
          </label>
          <input
            type="text"
            value={formData.instructor}
            onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL de la miniatura:
          </label>
          <input
            type="url"
            value={formData.thumbnail}
            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL del video:
          </label>
          <input
            type="url"
            value={formData.videoUrl}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            placeholder="https://ejemplo.com/video.mp4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="mr-2 rounded text-purple-500 focus:ring-purple-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Video activo (visible para suscriptores)
        </label>
      </div>

      <div className="flex space-x-3 pt-4 border-t">
        <button
          type="submit"
          className={`flex-1 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
            isCreating 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          }`}
        >
          {isCreating ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{isCreating ? 'Crear Video' : 'Guardar Cambios'}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  );
};

export default VideoManagement;