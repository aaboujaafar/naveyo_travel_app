import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { PackingListModule } from "./interface";

const PackingListContext = createContext<PackingListModule | null>(null);

export function PackingListProvider({
  module,
  children,
}: {
  module: PackingListModule | null;
  children: ReactNode;
}) {
  return (
    <PackingListContext.Provider value={module}>
      {children}
    </PackingListContext.Provider>
  );
}

export function usePackingList(): PackingListModule | null {
  return useContext(PackingListContext);
}
