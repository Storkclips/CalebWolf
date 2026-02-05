@@ .. @@
   const [loading, setLoading] = useState(true);

   const fetchProfile = async (userId: string) => {
@@ .. @@
     }
   };

+  const refreshProfile = async () => {
+    if (user) {
+      await fetchProfile(user.id);
+    }
+  };
+
   useEffect(() => {
@@ .. @@
   return {
     user,
     profile,
     loading,
+    refreshProfile,
     signIn,
     signUp,
     signOut,
   };