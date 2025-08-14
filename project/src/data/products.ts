export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  color: string;
  size: string;
  inStock: boolean;
  type: string;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Orquídea Phalaenopsis Rosa Elegante",
    price: 18999,
    originalPrice: 22999,
    image: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 5,
    reviews: 24,
    category: "Phalaenopsis",
    color: "pink",
    size: "Mediana",
    inStock: true,
    type: "Phalaenopsis"
  },
  {
    id: 2,
    name: "Orquídea Cattleya Púrpura Imperial",
    price: 28999,
    image: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 4,
    reviews: 12,
    category: "Cattleya",
    color: "purple",
    size: "Grande",
    inStock: true,
    type: "Cattleya"
  },
  {
    id: 3,
    name: "Maceta Artesanal de Cerámica Verde",
    price: 9999,
    image: "https://images.pexels.com/photos/1974508/pexels-photo-1974508.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 5,
    reviews: 18,
    category: "Macetas",
    color: "verde",
    size: "Mediana",
    inStock: true,
    type: "Macetas"
  },
  {
    id: 4,
    name: "Orquídea Dendrobium Blanca Pura",
    price: 16999,
    originalPrice: 19999,
    image: "https://images.pexels.com/photos/1408967/pexels-photo-1408967.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 4,
    reviews: 31,
    category: "Dendrobium",
    color: "white",
    size: "Pequeña",
    inStock: true,
    type: "Dendrobium"
  },
  {
    id: 5,
    name: "Orquídea Oncidium Dorada",
    price: 24999,
    image: "https://images.pexels.com/photos/68507/spring-flowers-flowers-collage-floral-68507.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 5,
    reviews: 8,
    category: "Oncidium",
    color: "yellow",
    size: "Grande",
    inStock: true, // Cambiar a true para probar las notificaciones
    type: "Oncidium"
  },
  {
    id: 6,
    name: "Maceta de Barro Natural Artesanal",
    price: 7999,
    image: "https://images.pexels.com/photos/1317712/pexels-photo-1317712.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 4,
    reviews: 15,
    category: "Macetas",
    color: "natural",
    size: "Pequeña",
    inStock: true,
    type: "Macetas"
  },
  {
    id: 7,
    name: "Orquídea Vanda Azul Celestial",
    price: 34999,
    originalPrice: 39999,
    image: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 5,
    reviews: 6,
    category: "Vanda",
    color: "blue",
    size: "Extra Grande",
    inStock: true,
    type: "Vanda"
  },
  {
    id: 8,
    name: "Orquídea Phalaenopsis Blanca Nieve",
    price: 15999,
    image: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 4,
    reviews: 22,
    category: "Phalaenopsis",
    color: "white",
    size: "Mediana",
    inStock: true,
    type: "Phalaenopsis"
  },
  {
    id: 9,
    name: "Maceta Decorativa con Diseño Floral",
    price: 14999,
    image: "https://images.pexels.com/photos/1974508/pexels-photo-1974508.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 5,
    reviews: 9,
    category: "Macetas",
    color: "multicolor",
    size: "Grande",
    inStock: true,
    type: "Macetas"
  },
  {
    id: 10,
    name: "Orquídea Cattleya Rosa Fuerte",
    price: 21999,
    originalPrice: 24999,
    image: "https://images.pexels.com/photos/1408967/pexels-photo-1408967.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 4,
    reviews: 14,
    category: "Cattleya",
    color: "pink",
    size: "Grande",
    inStock: true,
    type: "Cattleya"
  },
  {
    id: 11,
    name: "Orquídea Dendrobium Púrpura Real",
    price: 26999,
    image: "https://images.pexels.com/photos/68507/spring-flowers-flowers-collage-floral-68507.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 5,
    reviews: 11,
    category: "Dendrobium",
    color: "purple",
    size: "Mediana",
    inStock: true,
    type: "Dendrobium"
  },
  {
    id: 12,
    name: "Maceta de Fibra Natural Ecológica",
    price: 6999,
    image: "https://images.pexels.com/photos/1317712/pexels-photo-1317712.jpeg?auto=compress&cs=tinysrgb&w=500",
    rating: 4,
    reviews: 7,
    category: "Macetas",
    color: "natural",
    size: "Pequeña",
    inStock: true,
    type: "Macetas"
  }
];

// Función para obtener productos (con soporte para productos actualizados)
export const getProducts = (): Product[] => {
  const savedProducts = localStorage.getItem('orchid-products');
  if (savedProducts) {
    return JSON.parse(savedProducts);
  }
  return products;
};

// Sistema de notificaciones de disponibilidad
export const checkProductAvailability = () => {
  // Obtener usuarios registrados
  const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');
  
  users.forEach((user: any) => {
    // Obtener favoritos del usuario
    const userFavorites = JSON.parse(localStorage.getItem('orchid-favorites') || '[]');
    const userNotifications = JSON.parse(localStorage.getItem(`orchid-notifications-${user.email}`) || '[]');
    
    userFavorites.forEach((favoriteId: number) => {
      const product = getProducts().find(p => p.id === favoriteId);
      
      if (product && product.inStock) {
        // Verificar si ya se envió notificación para este producto
        const alreadyNotified = userNotifications.some((n: any) => 
          n.productId === product.id && n.notifiedAt > Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 días
        );
        
        if (!alreadyNotified) {
          // Marcar como notificado
          userNotifications.push({
            productId: product.id,
            productName: product.name,
            notifiedAt: Date.now()
          });
          localStorage.setItem(`orchid-notifications-${user.email}`, JSON.stringify(userNotifications));
          
          // Aquí se enviaría el email (se implementará en el componente)
          console.log(`📧 Notificación pendiente para ${user.email}: ${product.name} está disponible`);
        }
      }
    });
  });
};