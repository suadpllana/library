import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create or update profile for OAuth users
  const ensureProfile = useCallback(async (authUser) => {
    if (!authUser) return;

    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', authUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which means profile doesn't exist
        console.error('Error checking profile:', fetchError);
      }

      if (!existingProfile) {
        // Profile doesn't exist, create one for OAuth user
        const metadata = authUser.user_metadata || {};
        
        // Extract name from different OAuth providers
        let firstName = metadata.first_name || metadata.given_name || '';
        let lastName = metadata.last_name || metadata.family_name || '';
        
        // If we have full_name but not first/last, split it
        if (!firstName && metadata.full_name) {
          const nameParts = metadata.full_name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        // If still no name, use name field or email prefix
        if (!firstName && metadata.name) {
          const nameParts = metadata.name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        if (!firstName) {
          firstName = authUser.email?.split('@')[0] || 'User';
        }

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            first_name: firstName,
            last_name: lastName,
            role: 'user'
          });

        if (insertError) {
          console.error('Error creating profile for OAuth user:', insertError);
        } else {
          console.log('Created profile for OAuth user:', authUser.email);
        }
        
        return 'user';
      }

      return existingProfile.role || 'user';
    } catch (error) {
      console.error('Error in ensureProfile:', error);
      return 'user';
    }
  }, []);

  const fetchUserRole = useCallback(async (userId) => {
    if (!userId) return 'user';
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'user';
      }
      return data?.role || 'user';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'user';
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    const setupAuth = async () => {
      try {
        // Set up auth state change listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;

            console.log('Auth event:', event);

            if (event === 'SIGNED_OUT' || !session) {
              setUser(null);
              setUserRole(null);
              setLoading(false);
              return;
            }

            if (session?.user) {
              setUser(session.user);
              // Use setTimeout to avoid Supabase deadlock on simultaneous requests
              setTimeout(async () => {
                if (mounted) {
                  // Ensure profile exists for OAuth users before fetching role
                  const role = await ensureProfile(session.user);
                  if (mounted) {
                    setUserRole(role);
                    setLoading(false);
                  }
                }
              }, 0);
            }
          }
        );
        
        authSubscription = subscription;

        // Then get the current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setUser(null);
            setUserRole(null);
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          // Ensure profile exists for OAuth users before fetching role
          const role = await ensureProfile(session.user);
          if (mounted) {
            setUserRole(role);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error setting up auth:', error);
        if (mounted) {
          setUser(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [ensureProfile]);

  const isAdmin = () => userRole === 'admin';
  const isUser = () => userRole === 'user';

  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut: () => supabase.auth.signOut(),
    user,
    userRole,
    isAdmin,
    isUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};