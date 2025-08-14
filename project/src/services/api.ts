// Servicio base para comunicación con la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Obtener token del localStorage
  private getAuthToken(): string | null {
    return localStorage.getItem('orchid-token');
  }

  // Headers base para las requests
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Método genérico para hacer requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        headers: this.getHeaders(),
        ...options,
      };

      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      const data: ApiResponse<T> = await response.json();

      // Log de respuesta para debugging
      if (!data.success) {
        console.error('❌ API Error:', data);
      } else {
        console.log('✅ API Success:', endpoint);
      }

      // Si el token ha expirado, limpiar localStorage
      if (response.status === 401 && data.message?.includes('expirado')) {
        this.clearAuth();
        window.location.href = '/';
      }

      return data;
    } catch (error) {
      console.error('❌ Network Error:', error);
      return {
        success: false,
        message: 'Error de conexión con el servidor',
      };
    }
  }

  // Métodos HTTP
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Métodos de autenticación
  setAuthToken(token: string): void {
    localStorage.setItem('orchid-token', token);
  }

  clearAuth(): void {
    localStorage.removeItem('orchid-token');
    localStorage.removeItem('orchid-user');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }
}

// Instancia singleton del servicio API
export const apiService = new ApiService();

// Tipos de datos comunes
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  last_login?: string;
  is_admin: boolean;
  subscription_status?: string;
  subscription_expiry?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  color: string;
  size: string;
  in_stock: boolean;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface Accessory {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  description: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  cart_item_id: number;
  product_type: 'product' | 'accessory';
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  image: string;
  in_stock: boolean;
  color?: string;
  size?: string;
  product_category?: string;
  accessory_category?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  video_url: string;
  thumbnail: string;
  duration: number;
  category: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  favorite_id: number;
  product_type: 'product' | 'accessory';
  product_id: number;
  name: string;
  price: number;
  original_price?: number;
  image: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
  color?: string;
  size?: string;
  product_category?: string;
  accessory_category?: string;
  created_at: string;
}

// Clase de servicio API específico para funcionalidades
class OrchidApiService extends ApiService {
  // === AUTENTICACIÓN ===
  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    return this.post<AuthResponse>('/auth/login', data);
  }

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    return this.post<AuthResponse>('/auth/register', data);
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.post('/auth/logout');
    if (response.success) {
      this.clearAuth();
    }
    return response;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.get<User>('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.put<User>('/auth/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.post('/auth/change-password', { 
      currentPassword, 
      newPassword 
    });
  }

  // === PRODUCTOS ===
  async getProducts(filters?: {
    category?: string;
    color?: string;
    size?: string;
    type?: string;
    in_stock?: boolean;
    min_price?: number;
    max_price?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ products: Product[]; total: number; limit: number; offset: number }>> {
    const params = filters ? Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [k, String(v)])
    ) : undefined;
    return this.get('/products', params);
  }

  async getProduct(id: number): Promise<ApiResponse<{ product: Product }>> {
    return this.get(`/products/${id}`);
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<{ product: Product }>> {
    return this.post('/products', product);
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<ApiResponse<{ product: Product }>> {
    return this.put(`/products/${id}`, product);
  }

  async deleteProduct(id: number): Promise<ApiResponse> {
    return this.delete(`/products/${id}`);
  }

  async getProductCategories(): Promise<ApiResponse<{ categories: Array<{ category: string; count: number }> }>> {
    return this.get('/products/categories/list');
  }

  async getProductColors(): Promise<ApiResponse<{ colors: Array<{ color: string; count: number }> }>> {
    return this.get('/products/colors/list');
  }

  async getProductSizes(): Promise<ApiResponse<{ sizes: Array<{ size: string; count: number }> }>> {
    return this.get('/products/sizes/list');
  }

  // === ACCESORIOS ===
  async getAccessories(filters?: {
    category?: string;
    in_stock?: boolean;
    min_price?: number;
    max_price?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ accessories: Accessory[]; total: number; limit: number; offset: number }>> {
    const params = filters ? Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [k, String(v)])
    ) : undefined;
    return this.get('/accessories', params);
  }

  async getAccessory(id: number): Promise<ApiResponse<{ accessory: Accessory }>> {
    return this.get(`/accessories/${id}`);
  }

  async createAccessory(accessory: Omit<Accessory, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<{ accessory: Accessory }>> {
    return this.post('/accessories', accessory);
  }

  async updateAccessory(id: number, accessory: Partial<Accessory>): Promise<ApiResponse<{ accessory: Accessory }>> {
    return this.put(`/accessories/${id}`, accessory);
  }

  async deleteAccessory(id: number): Promise<ApiResponse> {
    return this.delete(`/accessories/${id}`);
  }

  async getAccessoryCategories(): Promise<ApiResponse<{ categories: Array<{ category: string; count: number }> }>> {
    return this.get('/accessories/categories/list');
  }

  // === CARRITO ===
  async getCart(): Promise<ApiResponse<{ items: CartItem[]; total: number; itemCount: number }>> {
    return this.get('/cart');
  }

  async addToCart(item: { product_type: 'product' | 'accessory'; product_id: number; quantity?: number }): Promise<ApiResponse> {
    return this.post('/cart', item);
  }

  async updateCartItem(cartItemId: number, quantity: number): Promise<ApiResponse> {
    return this.put(`/cart/${cartItemId}`, { quantity });
  }

  async removeFromCart(cartItemId: number): Promise<ApiResponse> {
    return this.delete(`/cart/${cartItemId}`);
  }

  async clearCart(): Promise<ApiResponse> {
    return this.delete('/cart');
  }

  // === VIDEOS PREMIUM ===
  async getVideos(filters?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ videos: Video[]; total: number; limit: number; offset: number }>> {
    const params = filters ? Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [k, String(v)])
    ) : undefined;
    return this.get('/videos', params);
  }

  async getVideo(id: number): Promise<ApiResponse<{ video: Video }>> {
    return this.get(`/videos/${id}`);
  }

  async createVideo(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<{ video: Video }>> {
    return this.post('/videos', video);
  }

  async updateVideo(id: number, video: Partial<Video>): Promise<ApiResponse<{ video: Video }>> {
    return this.put(`/videos/${id}`, video);
  }

  async deleteVideo(id: number): Promise<ApiResponse> {
    return this.delete(`/videos/${id}`);
  }

  async getVideoCategories(): Promise<ApiResponse<{ categories: Array<{ category: string; count: number }> }>> {
    return this.get('/videos/categories/list');
  }

  // === FAVORITOS ===
  async getFavorites(productType?: 'product' | 'accessory'): Promise<ApiResponse<{ favorites: Favorite[]; total: number }>> {
    const params = productType ? { product_type: productType } : undefined;
    return this.get('/favorites', params);
  }

  async addToFavorites(item: { product_type: 'product' | 'accessory'; product_id: number }): Promise<ApiResponse> {
    return this.post('/favorites', item);
  }

  async removeFromFavorites(favoriteId: number): Promise<ApiResponse> {
    return this.delete(`/favorites/${favoriteId}`);
  }

  async checkFavorite(productType: 'product' | 'accessory', productId: number): Promise<ApiResponse<{ isFavorite: boolean; favoriteId: number | null }>> {
    return this.get(`/favorites/check/${productType}/${productId}`);
  }
}

// Instancia singleton del servicio API específico
export const orchidApi = new OrchidApiService();

export default apiService;