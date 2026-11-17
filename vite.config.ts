import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// On the live site, files in /api are run by the host as server-side
// functions. `npm run dev` knows nothing about that, so this stands in for
// it: a request to /api/<name> is handed to api/<name>.ts, the same file the
// host runs. Local only — it is not part of the built site.
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      // The functions read their settings from the environment; in dev those
      // settings live in .env, which only the browser code is given by default.
      const env = loadEnv(server.config.mode, process.cwd(), 'VITE_')
      for (const [key, value] of Object.entries(env)) process.env[key] ??= value

      server.middlewares.use(async (req, res, next) => {
        const name = req.url?.match(/^\/api\/([a-z-]+)(\?|$)/)?.[1]
        if (!name) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          await mod.default(req, res)
        } catch (err) {
          console.error(err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'The local API failed — see the terminal.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
  server: {
    // Honor an assigned port (e.g. from preview tooling); default 5173.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
