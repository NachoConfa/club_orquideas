import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Save, X, Upload, Eye, EyeOff, DollarSign, Package, Image, Plus } from 'lucide-react';
import { Product } from '../data/products';

interface ProductManagementProps {
  onBack: () => void;
  user: { name: string; email: string } | null;
}

const ProductManagement: React.FC<ProductManagementProps> = ({ onBack, user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Verificar si el usuario es admin
  const isAdmin = user?.email === 'NachoGemerXD@hotmail.com';

  useEffect(() => {
    if (isAdmin) {
      // Cargar productos desde localStorage o usar productos por defecto
      const savedProducts = localStorage.getItem('orchid-products');
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        // Importar productos por defecto
        import('../data/products').then(module => {
          setProducts(module.products);
          localStorage.setItem('orchid-products', JSON.stringify(module.products));
        });
      }
    }
  }, [isAdmin]);

  const handleCreateNewProduct = () => {
    const newProduct: Product = {
      id: Math.max(...products.map(p => p.id)) + 1,
      name: 'Nuevo Producto',
      price: 0,
      image: 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500',
      rating: 5,
      reviews: 0,
      category: 'Orquídeas',
      color: 'rosa',
      size: 'Mediana',
      inStock: true,
      type: 'Orquídeas'
    };
    
    setEditingProduct(newProduct);
    setIsCreatingNew(true);
  };
  const handleSaveProduct = (updatedProduct: Product) => {
    let updatedProducts;
    
    if (isCreatingNew) {
      // Agregar nuevo producto
      updatedProducts = [...products, updatedProduct];
      setIsCreatingNew(false);
    } else {
      // Actualizar producto existente
      updatedProducts = products.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      );
    }
    
    setProducts(updatedProducts);
    localStorage.setItem('orchid-products', JSON.stringify(updatedProducts));
    setEditingProduct(null);
    
    // Actualizar también el archivo de productos para que se refleje en toda la app
    // Esto se hace guardando en localStorage con una clave especial que la app lee
    localStorage.setItem('orchid-products-updated', 'true');
    
    alert(isCreatingNew ? '✅ Producto creado correctamente' : '✅ Producto actualizado correctamente');
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setIsCreatingNew(false);
  };
  const handleImageUpload = (productId: number, imageUrl: string) => {
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, image: imageUrl } : p
    );
    
    setProducts(updatedProducts);
    localStorage.setItem('orchid-products', JSON.stringify(updatedProducts));
    
    if (editingProduct && editingProduct.id === productId) {
      setEditingProduct({ ...editingProduct, image: imageUrl });
    }
  };

  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === '' || product.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  const categories = [...new Set(products.map(p => p.category))];

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
            Volver al Inicio
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
          <p className="text-gray-600 mb-6">No tienes permisos para administrar productos.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al inicio</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-full mr-4">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Administración de Productos</h1>
              <p className="text-gray-600">Gestiona precios, disponibilidad e imágenes</p>
            </div>
          </div>

            <button
              onClick={handleCreateNewProduct}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Agregar Producto</span>
            </button>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las categorías</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Formulario de Nuevo Producto */}
          {isCreatingNew && editingProduct && (
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Crear Nuevo Producto
              </h3>
              <EditProductForm
                product={editingProduct}
                onSave={handleSaveProduct}
                onCancel={handleCancelEdit}
                onImageUpload={handleImageUpload}
                isCreating={true}
              />
            </div>
          )}
          {/* Lista de Productos */}
          <div className="space-y-4">
            {getFilteredProducts().map((product) => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                {editingProduct?.id === product.id && !isCreatingNew ? (
                  <EditProductForm
                    product={editingProduct}
                    onSave={handleSaveProduct}
                    onCancel={handleCancelEdit}
                    onImageUpload={handleImageUpload}
                    isCreating={false}
                  />
                ) : (
                  <ProductRow
                    product={product}
                    onEdit={() => setEditingProduct(product)}
                    onImageUpload={handleImageUpload}
                  />
                )}
              </div>
            ))}
          </div>

          {getFilteredProducts().length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron productos</h3>
              <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ProductRowProps {
  product: Product;
  onEdit: () => void;
  onImageUpload: (productId: number, imageUrl: string) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, onEdit, onImageUpload }) => {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleImageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newImageUrl.trim()) {
      onImageUpload(product.id, newImageUrl.trim());
      setNewImageUrl('');
      setShowImageUpload(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 transition-colors"
            title="Cambiar imagen"
          >
            <Image className="h-3 w-3" />
          </button>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="bg-gray-100 px-2 py-1 rounded">{product.category}</span>
            <span className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              ${product.price.toLocaleString('es-AR')}
            </span>
            <span className={`flex items-center ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
              {product.inStock ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {product.inStock ? 'Disponible' : 'Agotado'}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onEdit}
        className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
        title="Editar producto"
      >
        <Edit className="h-4 w-4" />
      </button>

      {showImageUpload && (
        <div className="absolute z-10 mt-2 bg-white border border-gray-300 rounded-lg p-4 shadow-lg">
          <form onSubmit={handleImageSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva URL de imagen:
              </label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowImageUpload(false)}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

interface EditProductFormProps {
  product: Product;
  onSave: (product: Product) => void;
  onCancel: () => void;
  onImageUpload: (productId: number, imageUrl: string) => void;
  isCreating: boolean;
}

const EditProductForm: React.FC<EditProductFormProps> = ({ product, onSave, onCancel, onImageUpload, isCreating }) => {
  const [formData, setFormData] = useState({
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice || '',
    image: product.image,
    inStock: product.inStock,
    category: product.category,
    color: product.color,
    size: product.size
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedProduct: Product = {
      ...product,
      name: formData.name,
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      image: formData.image,
      inStock: formData.inStock,
      category: formData.category,
      color: formData.color,
      size: formData.size
    };

    onSave(updatedProduct);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del producto:
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría:
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Phalaenopsis">Phalaenopsis</option>
            <option value="Cattleya">Cattleya</option>
            <option value="Dendrobium">Dendrobium</option>
            <option value="Oncidium">Oncidium</option>
            <option value="Vanda">Vanda</option>
            <option value="Macetas">Macetas</option>
            <option value="Accesorios">Accesorios</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio actual ($):
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio original ($) - opcional:
          </label>
          <input
            type="number"
            value={formData.originalPrice}
            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color:
          </label>
          <select
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="pink">Rosa</option>
            <option value="purple">Púrpura</option>
            <option value="white">Blanco</option>
            <option value="yellow">Amarillo</option>
            <option value="orange">Naranja</option>
            <option value="red">Rojo</option>
            <option value="blue">Azul</option>
            <option value="green">Verde</option>
            <option value="multicolor">Multicolor</option>
            <option value="natural">Natural</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tamaño:
          </label>
          <select
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Pequeña">Pequeña</option>
            <option value="Mediana">Mediana</option>
            <option value="Grande">Grande</option>
            <option value="Extra Grande">Extra Grande</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL de la imagen:
        </label>
        <input
          type="url"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="inStock"
          checked={formData.inStock}
          onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
          className="mr-2 rounded text-blue-500 focus:ring-blue-500"
        />
        <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
          Producto disponible
        </label>
      </div>

      <div className="flex space-x-3 pt-4 border-t">
        <button
          type="submit"
          className={`flex-1 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
            isCreating 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
          }`}
        >
          {isCreating ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{isCreating ? 'Crear Producto' : 'Guardar Cambios'}</span>
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

export default ProductManagement;