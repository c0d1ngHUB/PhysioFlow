import { create } from 'zustand';

export type Page = 'dashboard' | 'calendar' | 'patients' | 'invoices' | 'expenses' | 'admin';

const NAVIGATION_STORAGE_KEY = 'physioflow.navigation';

function readStoredNavigation(): { currentPage: Page; openModal: string | null } {
  if (typeof window === 'undefined') {
    return { currentPage: 'dashboard', openModal: null };
  }

  try {
    const raw = window.sessionStorage.getItem(NAVIGATION_STORAGE_KEY);
    if (!raw) {
      return { currentPage: 'dashboard', openModal: null };
    }

    const parsed = JSON.parse(raw) as { currentPage?: Page; openModal?: string | null };
    return {
      currentPage: parsed.currentPage ?? 'dashboard',
      openModal: parsed.openModal ?? null,
    };
  } catch {
    return { currentPage: 'dashboard', openModal: null };
  }
}

function storeNavigation(currentPage: Page, openModal: string | null) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify({ currentPage, openModal }));
}

interface NavigationState {
  currentPage: Page;
  openModal: string | null; // 'appointment' | 'patient' | 'invoice' | null
  navigateTo: (page: Page, modal?: string | null) => void;
  setOpenModal: (modal: string | null) => void;
}

const initialNavigation = readStoredNavigation();

export const useNavigation = create<NavigationState>((set, get) => ({
  currentPage: initialNavigation.currentPage,
  openModal: initialNavigation.openModal,
  navigateTo: (page, modal = null) => {
    storeNavigation(page, modal);
    set({ currentPage: page, openModal: modal });
  },
  setOpenModal: (modal) => {
    storeNavigation(get().currentPage, modal);
    set({ openModal: modal });
  },
}));
