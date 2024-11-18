// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// TODO: Remove no-unused-expressions once a fix is in place for esLint
//  see: https://github.com/eslint/eslint/issues/19134

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-expressions": "off"
        }
    }
);