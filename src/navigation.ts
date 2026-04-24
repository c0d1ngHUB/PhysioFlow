import { create } from 'zustand';

export type Page = 'dashboard' | 'calendar' | 'patients' | 'invoices' | 'expenses' | 'admin';

interface NavigationState {
  currentPage: Page;
  openModal: string | null; // 'appointment' | 'patient' | 'invoice' | null
  navigateTo: (page: Page, modal?: string | null) => void;
  setOpenModal: (modal: string | null) => void;
}

export const useNavigation = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  openModal: null,
  navigateTo: (page, modal = null) => set({ currentPage: page, openModal: modal }),
  setOpenModal: (modal) => set({ openModal: modal }),
}));
