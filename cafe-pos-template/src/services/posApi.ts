import { fetchApi } from './api';
import type { 
  Ingredient, ProductRecipe, InventoryLog, 
  CashierShift, ShiftCurrentResponse, ShiftMovement 
} from '../types/posV2';

export const posApi = {
  // Ingredients (Bahan Baku)
  getIngredients: async (activeOnly = false): Promise<Ingredient[]> => {
    const res = await fetchApi(`/v1/pos/ingredients${activeOnly ? '?active_only=1' : ''}`);
    return res.data || [];
  },

  createIngredient: async (data: Partial<Ingredient>): Promise<Ingredient> => {
    const res = await fetchApi('/v1/pos/ingredients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateIngredient: async (id: number, data: Partial<Ingredient>): Promise<void> => {
    await fetchApi(`/v1/pos/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteIngredient: async (id: number): Promise<void> => {
    await fetchApi(`/v1/pos/ingredients/${id}`, {
      method: 'DELETE',
    });
  },

  adjustIngredientStock: async (id: number, data: {
    type: 'in_purchase' | 'waste' | 'opname_adjustment';
    quantity: number;
    notes?: string;
    reference_id?: string;
  }): Promise<any> => {
    const res = await fetchApi(`/v1/pos/ingredients/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  getInventoryLogs: async (params?: { ingredient_id?: number; type?: string }): Promise<InventoryLog[]> => {
    let query = '';
    const qParts = [];
    if (params?.ingredient_id) qParts.push(`ingredient_id=${params.ingredient_id}`);
    if (params?.type) qParts.push(`type=${params.type}`);
    if (qParts.length > 0) query = `?${qParts.join('&')}`;

    const res = await fetchApi(`/v1/pos/inventory-logs${query}`);
    return res.data || [];
  },

  // Recipes (BOM)
  getProductRecipes: async (productId: number): Promise<ProductRecipe[]> => {
    const res = await fetchApi(`/v1/pos/products/${productId}/recipes`);
    return res.data || [];
  },

  saveProductRecipes: async (productId: number, recipes: {
    ingredient_id: number;
    quantity_needed: number;
    unit: string;
  }[]): Promise<void> => {
    await fetchApi(`/v1/pos/products/${productId}/recipes`, {
      method: 'POST',
      body: JSON.stringify({ recipes }),
    });
  },

  // Table Move & Merge
  moveTable: async (fromTableId: number, toTableId: number, notes?: string): Promise<any> => {
    const res = await fetchApi('/v1/pos/tables/move', {
      method: 'POST',
      body: JSON.stringify({ from_table_id: fromTableId, to_table_id: toTableId, notes }),
    });
    return res.data;
  },

  mergeTable: async (fromTableId: number, toTableId: number, notes?: string): Promise<any> => {
    const res = await fetchApi('/v1/pos/tables/merge', {
      method: 'POST',
      body: JSON.stringify({ from_table_id: fromTableId, to_table_id: toTableId, notes }),
    });
    return res.data;
  },

  // Split Bill
  splitBill: async (orderId: number, data: {
    split_type: 'by_item' | 'equal';
    items?: { order_item_id: number; quantity: number }[];
    split_count?: number;
  }): Promise<any> => {
    const res = await fetchApi(`/v1/pos/orders/${orderId}/split-bill`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  // Cashier Shifts
  getCurrentShift: async (): Promise<ShiftCurrentResponse> => {
    const res = await fetchApi('/v1/pos/shifts/current');
    return res.data;
  },

  openShift: async (data: { opening_cash: number; notes?: string }): Promise<any> => {
    const res = await fetchApi('/v1/pos/shifts/open', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  recordCashMovement: async (data: {
    shift_id?: number;
    type: 'cash_in' | 'cash_out';
    amount: number;
    reason: string;
  }): Promise<ShiftMovement> => {
    const res = await fetchApi('/v1/pos/shifts/cash-movement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  closeShift: async (data: {
    shift_id?: number;
    closing_cash_actual: number;
    notes?: string;
  }): Promise<any> => {
    const res = await fetchApi('/v1/pos/shifts/close', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  getShifts: async (): Promise<CashierShift[]> => {
    const res = await fetchApi('/v1/pos/shifts');
    return res.data || [];
  },
};
