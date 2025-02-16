import { z } from "zod";

export const TestCriteriaSchema = z.object({
  description: z.string(),
  required: z.boolean().default(true),
  testTypes: z.array(z.enum(['unit', 'integration', 'e2e'])),
  minimumCoverage: z.number().min(0).max(100).default(80),
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
        description: "Agent role detection accuracy",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90
      },
      {
        description: "Inter-agent message handling",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 85
      },
      {
        description: "Error handling and fallback mechanisms",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 90
      }
    ]
  },
  {
    name: "AI Provider Integration",
    criteria: [
      {
        description: "Provider API communication",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 85
      },
      {
        description: "Provider fallback mechanism",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90
      }
    ]
  },
  {
    name: "WebSocket Communication",
    criteria: [
      {
        description: "Real-time message delivery",
        required: true,
        testTypes: ['unit', 'integration'],
        minimumCoverage: 85
      },
      {
        description: "Connection error handling",
        required: true,
        testTypes: ['unit'],
        minimumCoverage: 90
      }
    ]
  }
];