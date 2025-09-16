import { Calendar, Film } from "lucide-react";
import useMeiliSearch from './hooks/useMeiliSearch';
import { useState } from 'react';

function MovieCard({ movie }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).getFullYear();
  };

  const truncateText = (text, maxLength = 140) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <div className="bg-black border border-gray-800 rounded-xl overflow-hidden shadow-2xl hover:shadow-3xl hover:border-gray-700 transition-all duration-500 hover:scale-[1.02] group cursor-pointer"
      onClick={() => movie.onEdit && movie.onEdit(movie)}>
      <div className="relative overflow-hidden">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-700"
          onError={(e) => {
            e.target.src = `data:image/svg+xml;base64,${btoa(`
              <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#000000"/>
                <rect x="20" y="20" width="260" height="360" fill="#111111" stroke="#333333" stroke-width="2"/>
                <text x="50%" y="50%" text-anchor="middle" fill="#666666" font-size="16" font-family="Arial">
                  No Image Available
                </text>
              </svg>
            `)}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-white leading-tight flex-1 mr-3 group-hover:text-blue-400 transition-colors duration-300">
            {movie.title}
          </h3>
          <div className="flex items-center text-gray-400 text-sm whitespace-nowrap">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDate(movie.release_date)}
          </div>
        </div>

        <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-3">
          {truncateText(movie.overview)}
        </p>

        <div className="flex flex-wrap gap-2">
          {movie?.genres?.slice(0, 3).map((genre, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-full hover:bg-gray-800 hover:border-gray-700 transition-all duration-200"
            >
              {genre}
            </span>
          ))}
          {movie?.genres?.length > 3 && (
            <span className="px-3 py-1 bg-gray-900 border border-gray-800 text-gray-400 text-xs rounded-full">
              +{movie.genres.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const { results, loading, error, estimatedTotalHits, editDocument, deleteDocument, createDocument, requery } = useMeiliSearch("", {
    index: 'movies',
    limit: 20
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', overview: '', genres: [], release_date: '', poster: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const openCreateModal = () => {
    setCreateForm({ title: '', overview: '', genres: [], release_date: '', poster: '' });
    setCreateModalOpen(true);
    setCreateError(null);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateError(null);
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: name === 'genres' ? value.split(',').map(g => g.trim()) : value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      // Auto-increment id: find max id in results and add 1
      const maxId = results.length > 0 ? Math.max(...results.map(m => Number(m.id) || 0)) : 0;
      const newId = maxId + 1;
      // Convert release_date from yyyy-mm-dd to timestamp
      const releaseTimestamp = createForm.release_date ? Math.floor(new Date(createForm.release_date).getTime() / 1000) : '';
      await createDocument({
        id: newId,
        ...createForm,
        release_date: releaseTimestamp,
      });
      requery();
      closeCreateModal();
    } catch (err) {
      setCreateError(err.message || 'Failed to create movie');
    } finally {
      setCreateLoading(false);
    }
  };
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDelete = async () => {
    if (!editMovie) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteDocument(editMovie.id);
      requery();
      closeEditModal();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete movie');
    } finally {
      setDeleteLoading(false);
    }
  };

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMovie, setEditMovie] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', overview: '', genres: [], release_date: '', poster: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const openEditModal = (movie) => {
    setEditMovie(movie);
    setEditForm({
      title: movie.title || '',
      overview: movie.overview || '',
      genres: movie.genres || [],
      release_date: movie.release_date || '',
      poster: movie.poster || ''
    });
    setEditModalOpen(true);
    setEditError(null);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditMovie(null);
    setEditError(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: name === 'genres' ? value.split(',').map(g => g.trim()) : value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      await editDocument({
        ...editMovie,
        ...editForm,
      });
      requery();
      closeEditModal();
    } catch (err) {
      setEditError(err.message || 'Failed to edit movie');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-screen bg-black text-white mx-auto">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-900 shadow-2xl">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Film className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">CinemaSearch</h1>
              <p className="text-gray-400 mt-1">Discover your next favorite movie</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Info */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-300 text-lg">
              {loading ? 'Loading...' : `${estimatedTotalHits || 0} movies found`}
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-950 border border-red-900 rounded-xl p-6 mb-8">
            <p className="text-red-200 text-lg">
              Error loading movies: {error.message}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        )}

        {/* Results Grid */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={{ ...movie, onEdit: openEditModal }} />
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && results.length === 0 && (
          <div className="flex justify-center">
            <div className="text-center py-16">
              <div className="p-4 bg-gray-900 rounded-full inline-block mb-6">
                <Film className="w-16 h-16 text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">No movies found</h3>
              <p className="text-gray-400 text-lg mb-6">
                Try adjusting your search terms or browse all movies
              </p>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {/* Create Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gray-950 border border-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                onClick={closeCreateModal}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold text-white mb-6">Add Movie</h2>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* ID is auto-incremented, not user input */}
                <div>
                  <label className="block text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={createForm.title}
                    onChange={handleCreateChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Overview</label>
                  <textarea
                    name="overview"
                    value={createForm.overview}
                    onChange={handleCreateChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Genres (comma separated)</label>
                  <input
                    type="text"
                    name="genres"
                    value={createForm.genres.join(', ')}
                    onChange={handleCreateChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Release Date</label>
                  <input
                    type="date"
                    name="release_date"
                    value={createForm.release_date}
                    onChange={handleCreateChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Poster URL</label>
                  <input
                    type="text"
                    name="poster"
                    value={createForm.poster}
                    onChange={handleCreateChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                {createError && (
                  <div className="text-red-400 text-sm mb-2">{createError}</div>
                )}
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded mt-4 disabled:opacity-50"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Floating Add Button */}
        <button
          className="fixed bottom-8 right-8 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg w-16 h-16 flex items-center justify-center text-3xl font-bold"
          onClick={openCreateModal}
          aria-label="Add Movie"
        >
          +
        </button>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gray-950 border border-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                onClick={closeEditModal}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold text-white mb-6">Edit Movie</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Overview</label>
                  <textarea
                    name="overview"
                    value={editForm.overview}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Genres (comma separated)</label>
                  <input
                    type="text"
                    name="genres"
                    value={editForm.genres.join(', ')}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Release Date (timestamp)</label>
                  <input
                    type="number"
                    name="release_date"
                    value={editForm.release_date}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Poster URL</label>
                  <input
                    type="text"
                    name="poster"
                    value={editForm.poster}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                {editError && (
                  <div className="text-red-400 text-sm mb-2">{editError}</div>
                )}
                {deleteError && (
                  <div className="text-red-400 text-sm mb-2">{deleteError}</div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded disabled:opacity-50"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Saving...' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded disabled:opacity-50"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App