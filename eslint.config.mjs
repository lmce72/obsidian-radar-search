import obsidianmd from 'eslint-plugin-obsidianmd';
import tseslint from 'typescript-eslint';

// Keep the community-review checks requested for runtime source in the normal check pipeline.
export default [{
  files:['src/**/*.ts'],
  languageOptions:{parser:tseslint.parser,parserOptions:{projectService:true,tsconfigRootDir:import.meta.dirname}},
  plugins:{obsidianmd},
  rules:{
    'obsidianmd/no-static-styles-assignment':'error',
    'obsidianmd/no-unsupported-api':'error',
    'obsidianmd/detach-leaves':'error'
  }
}];
