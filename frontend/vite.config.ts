import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from root directory
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    server: {
      host: "::",
      port: parseInt(env.VITE_PORT) || 8081,
      hmr: {
        overlay: false, // Disable error overlay for faster HMR
      },
      fs: {
        strict: false, // Allow serving files outside root
      },
      proxy: {
        // Proxy API requests to backend server during development
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Build optimizations
    build: {
      target: 'es2015',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Remove console.logs in production
          drop_debugger: true,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
        },
      },
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // UI libraries
            'vendor-ui': [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
              'lucide-react',
            ],
            // Charts and export libraries (heavy)
            'vendor-charts': ['recharts', 'jspdf', 'jspdf-autotable', 'xlsx'],
            // Form libraries
            'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
            // Date utilities
            'vendor-date': ['date-fns', 'react-day-picker'],
            // Query library
            'vendor-query': ['@tanstack/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Increase warning limit for vendor chunks
      cssCodeSplit: true, // Enable CSS code splitting
      sourcemap: !isProduction, // Only generate sourcemaps in development
    },
    // Dependency pre-bundling optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'date-fns',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },
    // Build caching
    cacheDir: '.vite',
    // Environment variable inlining
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __DEV__: !isProduction,
    },
    // ESBuild optimizations
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
  };
});
