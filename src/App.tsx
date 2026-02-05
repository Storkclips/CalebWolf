@@ .. @@
 import React, { useEffect, useState } from 'react';
-import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
+import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
+import { supabase } from './lib/supabase';
+import { User } from '@supabase/supabase-js';
+import { SubscriptionStatus } from './components/SubscriptionStatus';
+import { Login } from './pages/Login';
+import { Signup } from './pages/Signup';
+import { Success } from './pages/Success';
+import { Pricing } from './pages/Pricing';
 
 function App() {
+  const [user, setUser] = useState<User | null>(null);
+  const [loading, setLoading] = useState(true);
+
+  useEffect(() => {
+    // Get initial session
+    supabase.auth.getSession().then(({ data: { session } }) => {
+      setUser(session?.user ?? null);
+      setLoading(false);
+    });
+
+    // Listen for auth changes
+    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
+      setUser(session?.user ?? null);
+    });
+
+    return () => subscription.unsubscribe();
+  }, []);
+
+  const handleSignOut = async () => {
+    await supabase.auth.signOut();
+  };
+
+  if (loading) {
+    return (
+      <div className="page">
+        <div className="auth-container">
+          <div className="pill">Loading...</div>
+        </div>
+      </div>
+    );
+  }
+
   return (
     <Router>
       <div className="home-shell">
@@ -18,6 +58,25 @@
             <nav className="nav">
               <Link to="/" className="active">Home</Link>
               <Link to="/collections">Collections</Link>
+              <Link to="/pricing">Pricing</Link>
+            </nav>
+            <div className="topbar-actions">
+              {user ? (
+                <>
+                  <SubscriptionStatus />
+                  <div className="pill user-pill">{user.email}</div>
+                  <button onClick={handleSignOut} className="pill sign-out-btn">
+                    Sign Out
+                  </button>
+                </>
+              ) : (
+                <>
+                  <Link to="/login" className="pill">
+                    Sign In
+                  </Link>
+                  <Link to="/signup" className="btn">
+                    Sign Up
+                  </Link>
+                </>
+              )}
             </nav>
           </div>
@@ .. @@
         <main>
           <Routes>
             <Route path="/" element={<HomePage />} />
+            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
+            <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
+            <Route path="/success" element={user ? <Success /> : <Navigate to="/login" />} />
+            <Route path="/pricing" element={user ? <Pricing /> : <Navigate to="/login" />} />
             <Route path="/collections" element={<CollectionsPage />} />
           </Routes>
         </main>