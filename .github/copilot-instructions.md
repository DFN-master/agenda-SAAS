# Agenda-Sys Project Instructions

## Project Overview
<!-- Add a brief description of what this project does and its main purpose -->

## Architecture
<!-- Document the major components, service boundaries, and data flows -->

## Development Workflows

### Setup
<!-- Add setup commands and prerequisites -->

### Build & Run
<!-- Add build/run commands specific to this project -->

### Testing
<!-- Add testing commands and conventions -->

## Code Conventions
<!-- Document project-specific patterns and conventions that differ from common practices -->

## Key Files & Directories
<!-- Reference important files and directories that exemplify project patterns -->

## Integration Points
<!-- Document external dependencies and cross-component communication patterns -->

# Agenda-Sys Project Instructions for AI Agents

## General Rules

1. **Comprehensive Context Understanding**:
   - Always read all files in the project to fully understand the context before generating or modifying any code.

2. **Backend File Standards**:
   - All files in the `src` directory of the backend must be written in TypeScript (`.ts`).

3. **Source Code Corrections**:
   - Any corrections or updates must be made directly in the `src` directory of the backend.
   - After making changes, ensure the project is built using the appropriate build command (e.g., `npm run build`).

4. **Code Organization and Comments**:
   - Always keep the code well-organized and maintainable.
   - Add comments to explain the purpose of each item in the code to help developers understand its functionality.

5. **Function Separation**:
   - Each function must be placed in its own folder based on its domain.
     - Example: Functions related to scheduling should be in the `agenda` folder, and chat-related functions should be in the `chat` folder.

6. **Professional Code Standards**:
   - Always write professional-grade code.
   - Do not create simulations or remove functionality when encountering issues. Focus on identifying and fixing the root cause of the problem.

## Workflow Guidelines

- **Backend Development**:
  - Use TypeScript for all backend development.
  - Ensure all code is placed in the `src` directory and follows the folder structure rules.
  - Run `npm run build` after making changes to ensure the code compiles correctly.

- **Frontend Development**:
  - Follow React best practices for component structure and state management.
  - Ensure the code is modular and reusable.

- **Database Migrations and Seeds**:
  - Use Sequelize for managing migrations and seeds.
  - Ensure all database changes are versioned and reversible.

## Code Review Checklist

- Is the code well-organized and commented?
- Are all backend files in TypeScript and located in the `src` directory?
- Are functions separated into appropriate domain-specific folders?
- Has the code been built and tested after changes?
- Are database migrations and seeds properly versioned?

By following these rules, the project will maintain high standards of quality and professionalism.
