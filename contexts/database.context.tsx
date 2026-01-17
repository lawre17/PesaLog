import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { db, initializeDatabase } from '@/db';
import { seedCategories } from '@/db/seed/categories';

interface DatabaseContextType {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  db: typeof db;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);

        // Initialize database tables
        await initializeDatabase();

        // Seed default categories
        await seedCategories();

        setIsReady(true);
      } catch (err) {
        console.error('Database initialization error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady, isLoading, error, db }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }

  return context;
}

export function useDatabaseReady() {
  const { isReady, isLoading, error } = useDatabase();
  return { isReady, isLoading, error };
}
