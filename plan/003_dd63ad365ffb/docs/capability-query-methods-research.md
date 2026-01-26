# TypeScript Capability Query Helper Methods Research

## Executive Summary

This document researches and documents best practices for implementing capability query helper methods on TypeScript interfaces, focusing on keyof type usage, "supports()" and "hasFeature()" patterns, and common conventions used in popular TypeScript libraries.

## 1. TypeScript Keyof Usage Patterns

### 1.1 Basic Keyof Operations
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Extract union type of all keys
type UserKeys = keyof User; // 'id' | 'name' | 'email' | 'createdAt'

// Extract type of specific property
type IdType = User['id']; // string

// Dynamic property access with type safety
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Usage
const user: User = { id: '1', name: 'Alice', email: 'alice@example.com', createdAt: new Date() };
const userName = getProperty(user, 'name'); // Type: string
```

### 1.2 Conditional Property Access
```typescript
// Optional property access
function getOptionalProperty<T, K extends keyof T>(
  obj: T,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined {
  return obj[key] ?? defaultValue;
}

// Required property access with validation
function getRequiredProperty<T, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  if (!(key in obj)) {
    throw new Error(`Property ${String(key)} is required`);
  }
  return obj[key];
}
```

### 1.3 Keyof Utilities
```typescript
// Filter keys by value type
type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T];

// Usage: Get string keys only
type StringKeys = KeysOfType<User, string>; // 'id' | 'name' | 'email'

// Dynamic method creation
function createGetter<T, K extends keyof T>(key: K) {
  return (obj: T): T[K] => obj[key];
}

const getName = createGetter<User>('name');
console.log(getName(user)); // Returns user.name
```

## 2. Capability Query Method Patterns

### 2.1 Basic "supports()" Pattern
```typescript
class FeatureDetector {
  private static featureCache = new Map<string, boolean>();

  /**
   * Check if a specific feature is supported
   * @param feature - The feature to check
   * @returns true if the feature is supported
   */
  static supports(feature: string): boolean {
    // Check cache first
    if (this.featureCache.has(feature)) {
      return this.featureCache.get(feature)!;
    }

    // Perform feature detection
    const supported = this.detectFeature(feature);

    // Cache the result
    this.featureCache.set(feature, supported);
    return supported;
  }

  private static detectFeature(feature: string): boolean {
    switch (feature) {
      case 'typescript':
        return typeof window !== 'undefined' && 'TS' in window;
      case 'webassembly':
        return typeof WebAssembly === 'object';
      case 'intersection-observer':
        return 'IntersectionObserver' in window;
      case 'clipboard-api':
        return 'navigator.clipboard' in navigator;
      default:
        return false;
    }
  }
}
```

### 2.2 Typed Feature Detection
```typescript
class TypedFeatureDetector {
  // Feature detection functions
  private static features = {
    webAssembly: (): boolean => typeof WebAssembly === 'object',
    webWorkers: (): boolean => typeof Worker !== 'undefined',
    serviceWorker: (): boolean => 'serviceWorker' in navigator,
    intersectionObserver: (): boolean => 'IntersectionObserver' in window,
    mutationObserver: (): boolean => 'MutationObserver' in window,
    requestIdleCallback: (): boolean => 'requestIdleCallback' in window,
  } as const;

  /**
   * Check if a specific feature is supported with type safety
   * @param feature - Feature key from the features object
   * @returns true if the feature is supported
   */
  static supports<K extends keyof typeof this.features>(feature: K): boolean {
    const detector = this.features[feature];
    return typeof detector === 'function' ? detector() : false;
  }

  /**
   * Get all available features
   * @returns Array of supported feature names
   */
  static getSupportedFeatures(): Array<keyof typeof this.features> {
    return (Object.keys(this.features) as Array<keyof typeof this.features>).filter(
      feature => this.supports(feature)
    );
  }
}
```

### 2.3 Runtime Type Guards for Features
```typescript
// Type guard for feature availability
function isFeatureSupported<T extends string>(feature: T): feature is T & string {
  // Implementation would check actual feature availability
  const supportedFeatures = ['typescript', 'webpack', 'rollup'];
  return supportedFeatures.includes(feature);
}

// Usage
const feature = 'typescript' as const;
if (isFeatureSupported(feature)) {
  // TypeScript specific code
  console.log('TypeScript is supported');
}
```

## 3. Interface Convenience Method Best Practices

### 3.1 Interface Design Patterns
```typescript
// Basic interface with convenience methods
interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;

  // Convenience methods
  getDisplayName(): string;
  isValidEmail(): boolean;
  canEdit(): boolean;
  clone(): UserProfile;
}

// Implementation
class UserProfileImpl implements UserProfile {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public preferences: UserPreferences
  ) {}

  getDisplayName(): string {
    return this.name;
  }

  isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  canEdit(): boolean {
    return this.preferences.allowEditing;
  }

  clone(): UserProfile {
    return new UserProfileImpl(
      this.id,
      this.name,
      this.email,
      { ...this.preferences }
    );
  }
}
```

### 3.2 Builder Pattern for Complex Objects
```typescript
interface Configuration {
  apiEndpoint: string;
  timeout: number;
  retries: number;
  debug: boolean;
}

interface ConfigurationBuilder {
  setApiEndpoint(endpoint: string): this;
  setTimeout(timeout: number): this;
  setRetries(retries: number): this;
  setDebug(debug: boolean): this;
  build(): Configuration;
}

class ConfigurationBuilderImpl implements ConfigurationBuilder {
  private config: Partial<Configuration> = {};

  setApiEndpoint(endpoint: string): this {
    this.config.apiEndpoint = endpoint;
    return this;
  }

  setTimeout(timeout: number): this {
    this.config.timeout = timeout;
    return this;
  }

  setRetries(retries: number): this {
    this.config.retries = retries;
    return this;
  }

  setDebug(debug: boolean): this {
    this.config.debug = debug;
    return this;
  }

  build(): Configuration {
    return this.config as Configuration;
  }
}
```

### 3.3 Mixin Pattern for Capability Extension
```typescript
// Define capability interfaces
interface Editable {
  canEdit(): boolean;
  setEdited(): void;
}

interface Versionable {
  getVersion(): string;
  incrementVersion(): void;
}

// Mixin implementation
function Editable<T extends new (...args: any[]) => {}>(Base: T) {
  return class extends Base implements Editable {
    private _isEdited = false;

    canEdit(): boolean {
      return true;
    }

    setEdited(): void {
      this._isEdited = true;
    }
  };
}

function Versionable<T extends new (...args: any[]) => {}>(Base: T) {
  return class extends Base implements Versionable {
    private _version = '1.0.0';

    getVersion(): string {
      return this._version;
    }

    incrementVersion(): void {
      const parts = this._version.split('.');
      const patch = parseInt(parts[2], 10) + 1;
      this._version = `${parts[0]}.${parts[1]}.${patch}`;
    }
  };
}

// Combine capabilities
class DocumentModel extends Editable(Versionable(class {})) {
  constructor(public content: string) {
    super();
  }
}
```

## 4. Popular TypeScript Library Patterns

### 4.1 Express.js Middleware Patterns
```typescript
// Request augmentation with type guards
interface RequestWithUser extends Express.Request {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

function authenticate(req: Express.Request, res: Express.Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Cast to augmented type
  req as RequestWithUser;
  next();
}

// Type-safe route handler
app.get('/profile', authenticate, (req: RequestWithUser, res: Response) => {
  res.json({
    id: req.user.id,
    email: req.user.email
  });
});
```

### 4.2 React Component Patterns
```typescript
// Props with keyof constraints
interface ButtonProps {
  variant?: keyof typeof variants;
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onClick?: () => void;
}

const variants = {
  primary: 'bg-blue-500 text-white',
  secondary: 'bg-gray-200 text-gray-800',
  danger: 'bg-red-500 text-white'
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  onClick
}) => {
  return (
    <button
      className={`${variants[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### 4.3 Zod Schema Patterns
```typescript
import { z } from 'zod';

// Schema with validation methods
const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().optional()
});

// Type-safe validation
function createUser(data: unknown): User {
  return UserSchema.parse(data);
}

// Partial schema updates
function updateUser(user: User, updates: Partial<User>): User {
  return UserSchema.parse({ ...user, ...updates });
}
```

## 5. Common Anti-patterns and Gotchas

### 5.1 Common Anti-patterns
```typescript
// ❌ Anti-pattern: Any type usage
function supports(feature: any): boolean {
  // Loses all type safety
  return false;
}

// ❌ Anti-pattern: KeyOf without constraint
function getProperty<T>(obj: T, key: KeyOf<T>): T[KeyOf<T>] {
  // KeyOf<T> is not a valid type
  return obj[key];
}

// ❌ Anti-pattern: Mutable global state
let featureCache = new Map<string, boolean>();

function supports(feature: string): boolean {
  // Global state can cause issues
  featureCache.set(feature, true); // Side effects
  return true;
}
```

### 5.2 Performance Considerations
```typescript
// ✅ Good: Lazy feature detection
class OptimizedFeatureDetector {
  private static featureDetectors = new Map<string, () => boolean>();

  static supports(feature: string): boolean {
    // Only perform detection when needed
    if (!this.featureDetectors.has(feature)) {
      this.featureDetectors.set(feature, this.createDetector(feature));
    }
    return this.featureDetectors.get(feature)!();
  }

  private static createDetector(feature: string): () => boolean {
    // Return detection function
    switch (feature) {
      case 'webassembly':
        return () => typeof WebAssembly === 'object';
      // ... other detectors
      default:
        return () => false;
    }
  }
}
```

### 5.3 Type Safety Best Practices
```typescript
// ✅ Good: Use discriminated unions for feature types
type FeatureType =
  | { type: 'browser'; feature: BrowserFeature }
  | { type: 'node'; feature: NodeFeature };

// ✅ Good: Use const assertions for feature keys
const FEATURES = {
  WEB_ASSEMBLY: 'webassembly',
  SERVICE_WORKER: 'service-worker',
  INTERSECTION_OBSERVER: 'intersection-observer'
} as const;

type FeatureKey = typeof FEATURES[keyof typeof FEATURES];
```

## 6. Naming Conventions

### 6.1 Common Method Names
```typescript
// Capability checking methods
- supports() // Most common
- hasFeature() // Alternative
- canUse() // Action-oriented
- isAvailable() // State-oriented
- isEnabled() // Configuration-oriented
- checkCapability() // Explicit

// Property checking methods
- hasProperty() // For object properties
- contains() // For collection-like objects
- includes() // For arrays
- ownsProperty() // For prototype chains

// Convenience methods
- get() // Simple retrieval
- find() // Search operations
- create() // Factory methods
- build() // Builder pattern
```

### 6.2 Naming Guidelines
1. **Use descriptive verbs**: `supports()`, `hasFeature()`, `canEdit()`
2. **Be consistent**: Choose one pattern and stick to it
3. **Return boolean capability methods**: `supports()` should return `boolean`
4. **Use "has" for properties**: `hasProperty()` for object properties
5. **Use "can" for actions**: `canEdit()` for permissions
6. **Prefix utility methods**: `getDisplayName()` for computed values

## 7. Implementation Recommendations

### 7.1 For New Projects
1. Use typed feature detection with const assertions
2. Implement caching for expensive feature checks
3. Use discriminated unions for complex feature types
4. Follow a consistent naming convention

### 7.2 For Existing Projects
1. Gradually migrate from `any` types to proper keyof constraints
2. Add type guards for existing capability methods
3. Introduce caching for performance optimization
4. Document capability methods with JSDoc

### 7.3 Performance Optimization
```typescript
// Implement lazy loading for feature detection
class LazyFeatureDetector {
  private static detectors = new Map<string, () => boolean>();
  private static cache = new Map<string, boolean>();

  static supports(feature: string): boolean {
    // Check cache first
    if (this.cache.has(feature)) {
      return this.cache.get(feature)!;
    }

    // Create detector if not exists
    if (!this.detectors.has(feature)) {
      this.detectors.set(feature, this.createDetector(feature));
    }

    // Detect and cache
    const result = this.detectors.get(feature)!();
    this.cache.set(feature, result);
    return result;
  }
}
```

This research provides a comprehensive overview of TypeScript capability query helper methods, focusing on best practices, common patterns, and implementation strategies from popular TypeScript libraries.