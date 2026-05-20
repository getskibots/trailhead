import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the build under /<repo>/. Dev server keeps "/".
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/trailhead/' : '/',
  plugins: [react()],
});
