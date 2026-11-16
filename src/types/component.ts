export type ComponentStatus = 'active' | 'archived' | 'out_of_stock';

export interface Component {
  id: string;
  name: string;
  article: string;
  purchasePrice: number;
  markupPercent: number;
  price: number;
  warehouseCell: string;
  quantity: number;
  note: string;
  status: ComponentStatus;
  photo: string | null;
  hasPhoto: boolean;
  searchUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateComponentInput {
  name: string;
  article: string;
  purchasePrice: number;
  markupPercent: number;
  price: number;
  warehouseCell: string;
  quantity: number;
  status: ComponentStatus;
  photo?: string | null;
  note?: string;
  searchUrl?: string;
}

export interface UpdateComponentInput {
  name?: string;
  article?: string;
  purchasePrice?: number;
  markupPercent?: number;
  price?: number;
  warehouseCell?: string;
  quantity?: number;
  note?: string;
  status?: ComponentStatus;
  photo?: string | null;
  searchUrl?: string;
}

export interface ComponentListQuery {
  search?: string;
  status?: ComponentStatus;
  page?: number;
  pageSize?: number;
}