/**
 * Menu Item Model
 * Represents a menu item in a restaurant
 */

export interface MenuItem {
  id: string;              // UUID
  restaurantId: string;    // UUID reference to restaurants
  name: string;
  description?: string;
  category?: 'appetizer' | 'main' | 'dessert' | 'drink';
  price: number;
  image?: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  preparationTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemFilters {
  restaurantId: string;    // UUID
  category?: string;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  search?: string;
}
