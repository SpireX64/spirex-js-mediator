import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["./src/**/*.{js,mjs,cjs,jsx}"],
        plugins: { js },
        extends: ["js/recommended"],
        env: {
            es2015: true,
        },
        rules: {
            "no-var": "off",
        },
    },
]);
