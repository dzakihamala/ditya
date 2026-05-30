# Coding Standards

## Style

- Use camelCase for variables and functions
- Use PascalCase for React components, TypeScript types, and interfaces
- Prefer named exports over default exports (except for Next.js pages)
- All user-facing text in Indonesian (Bahasa Indonesia)
- Use the project's domain glossary from CONTEXT.md for naming

## TypeScript

- No `any` types — use `unknown` and narrow with type guards
- Use discriminated unions for wizard state machines
- Prefer `interface` for object shapes, `type` for unions and utilities
- All Firebase document types must have explicit TypeScript interfaces

## Testing

- Every public function in a deep module must have at least one test
- Use descriptive test names that explain the expected behavior
- Test external behavior, not implementation details
- Prefer Firebase emulator over mocking for Firestore tests
- Tests must pass before every commit

## Architecture

- Deep modules: isolate complex logic behind simple interfaces (Wizard Engine, Analysis computation)
- UI components are pure presentation — business logic lives in hooks or state machines
- Firestore operations are encapsulated in a data access layer, never called directly from components
- Each module must be independently testable

## Directory Convention

- `src/app/` — Next.js App Router pages
- `src/components/` — shared React components
- `src/lib/` — business logic, Firebase operations, state machines
- `src/types/` — TypeScript type definitions
- `src/__tests__/` — tests mirroring `src/` structure
