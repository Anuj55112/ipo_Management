"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Filters = {
  startDate: string;
  endDate: string;
  ipoId: string;
  accountId: string;
  allotmentStatus: string;
};

type IPOOption = {
  id: string;
  ipoName: string;
  status: string;
};

type AccountOption = {
  id: string;
  accountName: string;
  status: string;
};

type FilterContextType = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  resetFilters: () => void;
  ipoOptions: IPOOption[];
  accountOptions: AccountOption[];
  refreshOptions: () => Promise<void>;
  loadingOptions: boolean;
};

const defaultFilters: Filters = {
  startDate: "",
  endDate: "",
  ipoId: "",
  accountId: "",
  allotmentStatus: ""
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [ipoOptions, setIpoOptions] = useState<IPOOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const refreshOptions = async () => {
    try {
      setLoadingOptions(true);
      const [iposRes, accountsRes] = await Promise.all([
        fetch("/api/ipos"),
        fetch("/api/accounts?limit=1000") // Get all accounts for dropdown
      ]);
      
      if (iposRes.ok && accountsRes.ok) {
        const iposData = await iposRes.json();
        const accountsData = await accountsRes.json();
        setIpoOptions(iposData.map((i: any) => ({ id: i.id, ipoName: i.ipoName, status: i.status })));
        setAccountOptions(accountsData.accounts.map((a: any) => ({ id: a.id, accountName: a.accountName, status: a.status })));
      }
    } catch (error) {
      console.error("Failed to load filter options:", error);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    refreshOptions();
  }, []);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        resetFilters,
        ipoOptions,
        accountOptions,
        refreshOptions,
        loadingOptions
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
