import { useDispatch, useStore, useSelector, useDispatch as useReduxDispatch, useSelector as useReduxSelector } from "react-redux";
import type { AppDispatch, AppStore, RootState } from "@/store";

export type { RootState, AppDispatch, AppStore };

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(selector: (state: RootState) => T) => useSelector(selector);
export const useAppStore = () => useStore<AppStore>();
