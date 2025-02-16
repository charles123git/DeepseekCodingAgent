import { z } from "zod";

export const TestCriteriaSchema = z.object({
  description: z.string(),
  required: z.boolean().default(true),
  testTypes: z.array(z.enum(['unit', 'integration', 'e2e'])),
  minimumCoverage: z.number().min(0).max(100).default(80),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  dependencies: z.array(z.string()).default([]),
});

export type TestCriteria = z.infer<typeof TestCriteriaSchema>;

export const MVPFeatureSchema = z.object({
  name: z.string(),
  criteria: z.array(TestCriteriaSchema),
});

export type MVPFeature = z.infer<typeof MVPFeatureSchema>;

// Define the MVP features and their testing requirements
export const MVP_TEST_REQUIREMENTS: MVPFeature[] = [
  {
    name: "Agent Communication",
    criteria: [
      {
        description: "Message routing between agents",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: []
      },
      {
        description: "Agent role detection accuracy",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: ['Message routing between agents']
      },
      {
        description: "Inter-agent message handling",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 85,
        priority: 'high',
        dependencies: ['Agent role detection accuracy']
      },
      {
        description: "Error handling and fallback mechanisms",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: ['Message routing between agents']
      }
    ]
  },
  {
    name: "AI Provider Integration",
    criteria: [
      {
        description: "Provider API request formatting",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: []
      },
      {
        description: "Provider API response parsing",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: ['Provider API request formatting']
      },
      {
        description: "Provider API communication",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 85,
        priority: 'high',
        dependencies: ['Provider API response parsing']
      },
      {
        description: "Provider fallback mechanism",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: ['Provider API communication']
      }
    ]
  },
  {
    name: "WebSocket Communication",
    criteria: [
      {
        description: "WebSocket connection management",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: []
      },
      {
        description: "Message serialization/deserialization",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: ['WebSocket connection management']
      },
      {
        description: "Real-time message delivery",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 85,
        priority: 'high',
        dependencies: ['Message serialization/deserialization']
      },
      {
        description: "Connection error handling",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90,
        priority: 'critical',
        dependencies: ['WebSocket connection management']
      }
    ]
  }
];