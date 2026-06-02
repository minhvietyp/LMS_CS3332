import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getMyProfileRequest, type AuthUser } from '../../../../services/api/authApi';

export function useAccountProfile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const nextProfile = await getMyProfileRequest();
        if (!active) {
          return;
        }

        setProfile(nextProfile);
        updateUser(nextProfile);
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load account details.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [updateUser]);

  return {
    profile,
    isLoading,
    error,
    setProfile,
    setError,
  };
}

