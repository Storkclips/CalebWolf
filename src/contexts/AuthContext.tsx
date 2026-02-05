@@ .. @@
 interface AuthContextType {
   user: User | null;
   profile: Profile | null;
   loading: boolean;
 }
+  refreshProfile: () => Promise<void>;
   signIn: (email: string, password: string) => Promise<void>;
   signUp: (email: string, password: string, displayName?: string) => Promise<void>;
   signOut: () => Promise<void>;
@@ .. @@
 const defaultContext: AuthContextType = {
   user: null,
   profile: null,
   loading: true,
 }
+  refreshProfile: async () => {},
   signIn: async () => {},
   signUp: async () => {},
   signOut: async () => {},
@@ .. @@
 export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 }
-  const { user, profile, loading, signIn, signUp, signOut } = useAuth();
+  const { user, profile, loading, refreshProfile, signIn, signUp, signOut } = useAuth();

   return (
   )
-    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
+    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signIn, signUp, signOut }}>
       {children}
     </AuthContext.Provider>
   );