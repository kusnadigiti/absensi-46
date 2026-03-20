import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mock API for User Management (if Supabase is not configured)
  // In a real app, this would use the Supabase Admin SDK
  app.post("/api/admin/users", async (req, res) => {
    // This is a placeholder for the actual Supabase Admin API call
    // which requires the SUPABASE_SERVICE_ROLE_KEY
    try {
      const { email, password, role, name } = req.body;
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        // Mock success if no key is provided
        console.log("Mock creating user:", { email, role, name });
        return res.json({ success: true, user: { id: "mock-id-" + Date.now(), email, role, name } });
      }

      // Here you would initialize the Supabase Admin client and create the user
      // const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      // const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
      // ... handle error and insert into public.users table ...

      res.json({ success: true, message: "User created (placeholder)" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log("Mock deleting user:", id);
        return res.json({ success: true });
      }

      // const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      // const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      
      res.json({ success: true, message: "User deleted (placeholder)" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
