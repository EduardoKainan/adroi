
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Organization } from '../types';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Ref para evitar fetch desnecessário se o usuário não mudou
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Check active session immediately
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn("Erro na sessão inicial:", error.message);
          if (mounted) setLoading(false);
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            lastUserId.current = session.user.id;
            await fetchProfile(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // 2. Listen for auth changes (Token Refresh, Sign In/Out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Ignora TOKEN_REFRESHED se já temos o usuário carregado para evitar re-renders pesados
      // A sessão será atualizada silenciosamente pelo client do Supabase para requests
      if (event === 'TOKEN_REFRESHED' && session?.user?.id === lastUserId.current) {
         setSession(session); // Apenas atualiza token, não reseta loading ou perfil
         return;
      }

      setSession(session);
      const newUser = session?.user ?? null;
      setUser(newUser);

      if (newUser) {
        // Só busca perfil se o usuário mudou (Login ou Troca de Conta)
        if (newUser.id !== lastUserId.current) {
           lastUserId.current = newUser.id;
           // setLoading(true); // Opcional: Mostrar loading ao trocar de usuário
           await fetchProfile(newUser.id);
        }
      } else {
        // Logout
        lastUserId.current = null;
        setProfile(null);
        setOrganization(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch user profile linked to org
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as UserProfile);

      // Fetch organization details
      if (profileData?.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.organization_id)
          .single();
        
        if (!orgError) setOrganization(orgData as Organization);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setOrganization(null);
    lastUserId.current = null;
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, organization, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
