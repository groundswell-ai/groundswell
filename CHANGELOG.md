## [1.0.1](https://github.com/groundswell-ai/groundswell/compare/v1.0.0...v1.0.1) (2026-06-30)


### Bug Fixes

* **harnesses:** use file-backed AuthStorage.create() over inMemory() to honor ~/.pi/agent/auth.json (PRD §9.2.6) ([a026a1c](https://github.com/groundswell-ai/groundswell/commit/a026a1cd8a8ff7e5805987db32dd8bb16e05a912))

# 1.0.0 (2026-06-23)


### Bug Fixes

* emit LLM provider instead of harness id in streaming metadata ([73be74c](https://github.com/groundswell-ai/groundswell/commit/73be74c45d1e146116c3f6cedfbb9c63aa6c08f1))
* **harnesses:** forward systemPrompt to Pi via appendSystemPrompt ([fd06a20](https://github.com/groundswell-ai/groundswell/commit/fd06a20bd5d373c69c92eab9b5aa00d27bf674be))


### Features

* accept Unicode letters and emoji in workflow names ([2b871b7](https://github.com/groundswell-ai/groundswell/commit/2b871b74dc2e287a749dd43d7cb0000ea63e901f))
* add @Step decorator documentation with timing defaults ([3f7558b](https://github.com/groundswell-ai/groundswell/commit/3f7558bbcf1212939572392de69e9cfd818ad4f5))
* add @Task decorator documentation with validation behavior ([59aafd0](https://github.com/groundswell-ai/groundswell/commit/59aafd076bf06fd58f1e2adebf4c4bb2e9aa4064))
* add 4-scenario agent harness cascade matrix regression test ([08bd6e7](https://github.com/groundswell-ai/groundswell/commit/08bd6e7533392d879fd035d58c413fbf938bb9ef))
* add 5 failing tests for detachChild method with TDD approach ([e5afafe](https://github.com/groundswell-ai/groundswell/commit/e5afafe1ce189614fe430f3c5eb7e2f70169c700))
* add agent response model with JSON requirement and remove bug fix summary documentation ([cb3c397](https://github.com/groundswell-ai/groundswell/commit/cb3c397b728806626b2e753e7a33d441c0143dca))
* add childDetached event type to WorkflowEvent discriminated union ([ee8c424](https://github.com/groundswell-ai/groundswell/commit/ee8c4244a9a38c1c2bd46eaee3bc655aa6ae03f6))
* add circular reference detection tests and complete P1.M1.T2.S1 milestone ([868b5d1](https://github.com/groundswell-ai/groundswell/commit/868b5d1ec548c0bc2bf98749d675b56d2d55642c))
* add complex circular reference tests for multi-depth validation ([8fd796b](https://github.com/groundswell-ai/groundswell/commit/8fd796bab2426ee823a68d925d9d324f7ed467a6))
* add comprehensive @Task decorator documentation with validation behavior ([7269f41](https://github.com/groundswell-ai/groundswell/commit/7269f416824e4074aae1e68ebeeeca86697dbccd))
* add comprehensive adversarial and PRD compliance tests ([c2b518f](https://github.com/groundswell-ai/groundswell/commit/c2b518f88627d4f76c88bd465655c0d17505104d))
* add comprehensive adversarial and PRD compliance testsThis commit adds a suite of adversarial and PRD compliance tests to validate the hierarchical workflow engine's behavior against edge cases, potential bugs, and PRD specifications. The tests cover:1. **Deep Analysis Tests** - Probing edge cases for observables, workflow logger, decorators, and event propagation2. **Adversarial Edge Case Tests** - Exploring potential bugs, memory issues, and adversarial scenarios3. **PRD Compliance Tests** - Verifying that the implementation matches the PRD specificationsKey areas tested:- PRD requirement compliance (step defaults, logger behavior, event formats)- Edge cases (empty values, unicode characters, deep hierarchies)- Memory and performance scenarios- Error handling and recovery- Observer event propagation- Circular reference prevention- Tree structure integrity- Workflow lifecycle validationThese tests provide comprehensive coverage for validating the robustness and correctness of the workflow engine, ensuring it handles both normal and adversarial scenarios correctly. ([d3cf735](https://github.com/groundswell-ai/groundswell/commit/d3cf735724e53c78402e0daa563c8b5566a0911c))
* add comprehensive bug fix planning with analysis and task backlog ([2d4f849](https://github.com/groundswell-ai/groundswell/commit/2d4f849f2537f16d8859da7667721312c720665f))
* add comprehensive documentation generator with llms_full.txt ([ad3d156](https://github.com/groundswell-ai/groundswell/commit/ad3d1569b665b4d1a8aeea175ce8da682e90cd03))
* add comprehensive package keywords for workflow orchestration ([a3a3868](https://github.com/groundswell-ai/groundswell/commit/a3a386833540d8e49f56a48286e64df177e64cee))
* add comprehensive test for functional workflow error state and logs capture ([19a4be9](https://github.com/groundswell-ai/groundswell/commit/19a4be980e939f4d790e444200c2a8229cc42f08))
* add comprehensive TypeScript options and request interface patterns with provider types and documentation research ([d0f91d7](https://github.com/groundswell-ai/groundswell/commit/d0f91d7c0c04eae09a4611aed2f244f04b528f45))
* add ConfigError with CONFIG_ERROR code and idempotent harness bootstrap helper ([c009a62](https://github.com/groundswell-ai/groundswell/commit/c009a627024993023e23502aef6ef0a75d0ca575))
* add configureHarnesses default-resolution regression test ([63bf81f](https://github.com/groundswell-ai/groundswell/commit/63bf81fe8131a0cf75b711f3852d7132c115bc49))
* add cross-harness parity integration tests for PRD section 7.14 ([402cc6f](https://github.com/groundswell-ai/groundswell/commit/402cc6f2ef853bbb9d833b24ab6da1a5502054f8))
* add cycle detection test to workflow.test.ts ([8f8ca5f](https://github.com/groundswell-ai/groundswell/commit/8f8ca5f15a24662efd0639eed21e001a0e028659))
* add deep hierarchy stress test for stack overflow validation ([a714703](https://github.com/groundswell-ai/groundswell/commit/a71470339dcce5dbcd3ee58a1ebe3abf38b18dd1))
* add detachChild method with tree cleanup and event emission ([28bb171](https://github.com/groundswell-ai/groundswell/commit/28bb171e7b64cf78d05e9ecaad0f4b19f1422d15))
* add duplicate check to attachChild method ([664d042](https://github.com/groundswell-ai/groundswell/commit/664d042bc89006e0e73f97b7af65d8bfcf6f88f3))
* add getObservedState import to workflow-context.ts ([3ca0aff](https://github.com/groundswell-ai/groundswell/commit/3ca0aff267141bc6afe4b7464f6ad0b99681898a))
* add getObservedState import to workflow-context.ts and fix empty state in step() error handler ([9b04cc5](https://github.com/groundswell-ai/groundswell/commit/9b04cc54ea8961d505bb202f12e43ec030cfbc11))
* add harness config cascade module with dual-singleton legacy alias delegation and shim re-export ([5270a79](https://github.com/groundswell-ai/groundswell/commit/5270a799c800ff4b973d86fe5d86fed668519ef6))
* add harness reference doc and provider-to-harness migration guide ([ab13273](https://github.com/groundswell-ai/groundswell/commit/ab132733718df717e6ae14c13b4fbd47af0cebf5))
* add hook-ordering and cache-isolation cross-harness parity tests for PRD 7.14.3/5 ([bd97dc0](https://github.com/groundswell-ai/groundswell/commit/bd97dc08eac5b669c5eba726d4055d767713ece8))
* add Ink library integration for interactive workflow tree debugger with hello-world prototype ([4bd3db8](https://github.com/groundswell-ai/groundswell/commit/4bd3db82adfd5b768ebab2d69cd45786e9800266))
* add integration test for treeUpdated event propagation ([30c5e26](https://github.com/groundswell-ai/groundswell/commit/30c5e26fcea013590ef9a8dfd4b48d6c63c85a0d))
* add isDescendantOf helper method with cycle detection for tree integrity ([b8732fc](https://github.com/groundswell-ai/groundswell/commit/b8732fc5b9fad012cccd7927d235e1457cea94ac))
* add JSDoc comment to trackTiming option documenting default true ([ea0949c](https://github.com/groundswell-ai/groundswell/commit/ea0949cb4d17c852037700df9ec7ab636cf56b8a))
* add lazy auto-registration safety net for built-in harnesses ([b529564](https://github.com/groundswell-ai/groundswell/commit/b529564c68114ab866f9815650b3266451626f1c))
* add M1 zero-setup agent regression tests ([ee7f211](https://github.com/groundswell-ai/groundswell/commit/ee7f211b09189616bc4e73972a9031ffad14ece8))
* add manual parent mutation test for attachChild defensive validation ([4ebd6d2](https://github.com/groundswell-ai/groundswell/commit/4ebd6d2d372bb8a6237ad71ed7e74e69a90ab76d))
* add MCPHandler delegation support for pre-registered tools with executor preservation ([3948695](https://github.com/groundswell-ai/groundswell/commit/394869538509dfa9e580fe327b864933ea96f67f))
* add package.json files field to control npm package distribution ([5478761](https://github.com/groundswell-ai/groundswell/commit/547876165690ffe817648506d0f7efd0733f4433))
* add parent validation in attachChild to prevent tree integrity violations ([a4b1c01](https://github.com/groundswell-ai/groundswell/commit/a4b1c011253dbfd9232105847d364f47aae53150))
* add parent validation TDD test with console mocking ([45535d6](https://github.com/groundswell-ai/groundswell/commit/45535d67a470e3f1a6a7116df608e4fb88935311))
* add parent validation test results and complete P1.M1.T1 milestone ([da4b8b7](https://github.com/groundswell-ai/groundswell/commit/da4b8b7c96b0a0becf55e18873544f64f4ee8fa0))
* add Pi SDK dep and PiHarness skeleton with open-provider normalizeModel ([a738eb7](https://github.com/groundswell-ai/groundswell/commit/a738eb766ca5944266795bf566a643ed7ad91881))
* add PiHarness toolExecutor bridge regression test for PRD 7.10 ([d26e43f](https://github.com/groundswell-ai/groundswell/commit/d26e43f45bf43ea1f85c0f1eb62415426388b3b4))
* add pure-type harnesses module with orthogonal HarnessId and ModelProviderId axes ([a7c2ac5](https://github.com/groundswell-ai/groundswell/commit/a7c2ac51c02b2a3fb8def29440ffe3bc195b7730))
* add reparenting workflow example with detach-then-attach pattern ([88b5ed0](https://github.com/groundswell-ai/groundswell/commit/88b5ed0dbd847379a1f08599104b19ba28d23c9a))
* add repository URL to package.json metadata ([0fd579c](https://github.com/groundswell-ai/groundswell/commit/0fd579cb57bd9863d8f41e10c4751cdf5b2f5818))
* add runtime validation to Agent.prompt() return path with Zod schema enforcement and INTERNAL_ERROR handling ([f29ad04](https://github.com/groundswell-ai/groundswell/commit/f29ad045a793756aac1424a94a4a47a2303a883b))
* add subtask-planning PRP base commands with version bump to 0.0.2 ([70a7df2](https://github.com/groundswell-ai/groundswell/commit/70a7df2a526ae45861e2ab68c4a75c090bc0a7c6))
* add test for @ObservedState fields in workflow error state capture ([1ccae51](https://github.com/groundswell-ai/groundswell/commit/1ccae511f07632522cccc74e36a08ad893a88b8d))
* add test for cycle detection in getRootObservers method ([5e0269b](https://github.com/groundswell-ai/groundswell/commit/5e0269b811801de640ccc5a347b3bbf032da0f7e))
* add test for treeUpdated event emission on setStatus method ([08a5386](https://github.com/groundswell-ai/groundswell/commit/08a538628050757ea5992b9fdcda9bfecf3a5d2f))
* add ToolExecutionResult-to-AgentToolResult converter on MCPHandler ([dfddf18](https://github.com/groundswell-ai/groundswell/commit/dfddf18213e3e757f20b91421db3f73caaa8d934))
* add tree consistency validation test for reparenting using WorkflowTreeDebugger ([d1bcbc7](https://github.com/groundswell-ai/groundswell/commit/d1bcbc71ffbc2422e4f0d1232e87ce870b42f71d))
* add treeUpdated event emission to setStatus method to enable tree debugger updates ([0604d23](https://github.com/groundswell-ai/groundswell/commit/0604d231e150bcab4293d73d9f243da781339208))
* add treeUpdated event emission to snapshotState method ([fecfc95](https://github.com/groundswell-ai/groundswell/commit/fecfc9523062dcae6881e26450f71eba9292f16c))
* add TypeScript safety with type assertions for optional properties ([305bbdf](https://github.com/groundswell-ai/groundswell/commit/305bbdf839f9984b96b662e1ef20fff9c4480d45))
* add WorkflowContext step error state capture test to context.test.ts ([37d5191](https://github.com/groundswell-ai/groundswell/commit/37d51915dea78f2d0852222a29522dbc5a0421b0))
* add Zod schema validation for AgentResponse types with discriminated union support and null-over-undefined handling ([4eab936](https://github.com/groundswell-ai/groundswell/commit/4eab9362426610ea9872829ca869af2d78cdcf98))
* adopt harness types in stream() with fallback ([e94b81f](https://github.com/groundswell-ai/groundswell/commit/e94b81f61418b02ca94b4b8b5430373d53dfb31e))
* complete adversarial test suite execution and fix failures with PRD 6.4.4 compliance validation ([b5382d3](https://github.com/groundswell-ai/groundswell/commit/b5382d363754406ac101314b4f1e39ed5fc197fa))
* complete adversarial test suite for AgentResponse edge cases with PRD 6.4 compliance ([9d7b70d](https://github.com/groundswell-ai/groundswell/commit/9d7b70d1fb59a1c6c2eb4e1900cca97c8f96e0c2))
* complete Agent constructor with provider configuration storage and backward compatibility support ([0d7e9e6](https://github.com/groundswell-ai/groundswell/commit/0d7e9e6734a9e3306b84b9c886a7ff0541fc8d8f))
* complete Agent constructor with provider instance retrieval from registry and configuration cascade support ([c9552a3](https://github.com/groundswell-ai/groundswell/commit/c9552a3ef66e28ff0945c192d09f9a0c0820f9e7))
* complete agent response validation documentation with comprehensive workflows examples error handling and API reference ([2e73b70](https://github.com/groundswell-ai/groundswell/commit/2e73b70ca69635c56f69a35588034d417725fc9a))
* complete Agent SDK provider system with full feature parity and cascading configuration support ([93c49a2](https://github.com/groundswell-ai/groundswell/commit/93c49a2c3011cba6d70fb805697abf2111c8c832))
* complete Agent toolExecutor method with provider delegation and MCPHandler integration ([da067ec](https://github.com/groundswell-ai/groundswell/commit/da067ec929e2daaa0e492671c9b7545d2fc1dd89))
* complete Agent-Provider integration tests with comprehensive test suite covering tool delegation, session management, and configuration cascade ([615d878](https://github.com/groundswell-ai/groundswell/commit/615d878639130bd1d5d8e59663267c527f184835))
* complete Agent.prompt() call sites research with comprehensive inventory and findings report ([1df2dbe](https://github.com/groundswell-ai/groundswell/commit/1df2dbe0dc1dca257147ba9972ed105a2b826826))
* complete Agent.prompt() refactoring to return AgentResponse<T> with error handling and metadata ([05372da](https://github.com/groundswell-ai/groundswell/commit/05372da826c01d1c1aaa7ca4a11fef5c01f0b865))
* complete Agent.prompt() validation refactoring with error handling and metadata override ([238f389](https://github.com/groundswell-ai/groundswell/commit/238f3899d750a4ff23892ffe3445164e6d2ead46))
* complete Agent.stream() implementation with provider streaming support and AsyncStream interface ([1d547bc](https://github.com/groundswell-ai/groundswell/commit/1d547bced9442606009532a2dc0d84b58d9a774e))
* complete Agent.validateResponse utility extraction with shared validation logic and comprehensive test coverage ([b886e89](https://github.com/groundswell-ai/groundswell/commit/b886e890cd1673f8a991acdb4dd21d727bb757f5))
* complete AgentResponse factory helper functions with type guards and comprehensive testing ([9995849](https://github.com/groundswell-ai/groundswell/commit/9995849f793509d8e3ef3c63225d0375df3f7eb8))
* complete AgentResponse handling in workflow context with type safety and error propagation ([50fc7cb](https://github.com/groundswell-ai/groundswell/commit/50fc7cbd140ea7c9b7ccf790ed4774af4dd634d6))
* complete AgentResponse migration guide with comprehensive before/after examples and PRD 6.4 compliance documentation ([b0a41ac](https://github.com/groundswell-ai/groundswell/commit/b0a41acf4269fd88e37abcd828241d05901c96fa))
* complete AgentResponse migration guide with comprehensive documentation and CI performance optimization ([269bc29](https://github.com/groundswell-ai/groundswell/commit/269bc29e24c506fd63f7780f1f625701eeae45b7))
* complete AgentResponse refactor as discriminated union with compile-time type safety ([ac71245](https://github.com/groundswell-ai/groundswell/commit/ac71245a85c084ed2ed7252cd5be4637b5584915))
* complete AgentResponse schema validation test suite with PRD 6.4 compliance ([ea17ba8](https://github.com/groundswell-ai/groundswell/commit/ea17ba857479e4d557855ddc3372e75be66d84ac))
* complete AgentResponse type exports and public API validation ([9b33b6c](https://github.com/groundswell-ai/groundswell/commit/9b33b6ce9b99bc4167f4e75852eb6f8be9998004))
* complete AgentResponse types with comprehensive JSDoc documentation and PRD 6.4 requirements ([e8b742d](https://github.com/groundswell-ai/groundswell/commit/e8b742db0ca48963723d59bc126ba624b6aa44c8))
* complete analyzeError method implementation with hierarchical error analysis and restart decision logic ([5685936](https://github.com/groundswell-ai/groundswell/commit/5685936fa1ce49e4694afdfab4e75831e7938c49))
* complete analyzeErrorForRestart utility implementation with comprehensive error analysis and restart decision logic ([d8d0cf5](https://github.com/groundswell-ai/groundswell/commit/d8d0cf5ae8300270411f1a047c3ed10b37157655))
* complete AnthropicProvider buildAgentSDKHooks() method with hook type mapping, signature transformation, and comprehensive test coverage ([14525c0](https://github.com/groundswell-ai/groundswell/commit/14525c0e5ad2394e58ea7c8ea9e8b336ff2a2f26))
* complete AnthropicProvider class structure with provider interface implementation and lazy SDK loading ([1bf94b3](https://github.com/groundswell-ai/groundswell/commit/1bf94b37930f88a991f983e1e376858b2720f5d8))
* complete AnthropicProvider execute() method with message iteration, SDK response processing, and proper error handling ([34d3e62](https://github.com/groundswell-ai/groundswell/commit/34d3e6239ad60f02ab647885bf7f2ed4a37f1ab6))
* complete AnthropicProvider execute() method with query construction and SDK integration ([4df4baf](https://github.com/groundswell-ai/groundswell/commit/4df4baf0d0765c045d83a7446e6b9b37404c6684))
* complete AnthropicProvider execute() method with session support, SDK streamInput() integration, and user message accumulation for multi-turn conversations ([fb2c63a](https://github.com/groundswell-ai/groundswell/commit/fb2c63a6ad49b07c94e8bfd4850ba4db6bb49b1a))
* complete AnthropicProvider execute() testing with comprehensive test suite and research documentation ([e641cf9](https://github.com/groundswell-ai/groundswell/commit/e641cf9cabc5208dffcf811ef24680740da16f49))
* complete AnthropicProvider initialize() method with lazy SDK loading and configuration support ([e749635](https://github.com/groundswell-ai/groundswell/commit/e749635ad7ebe7c2cb527bcde8ae89137af09f3c))
* complete AnthropicProvider loadSkills() method with skill loading, prompt injection, and test coverage ([44d29f5](https://github.com/groundswell-ai/groundswell/commit/44d29f5e9b09818e151ffe6783b5163427dcf6c6))
* complete AnthropicProvider normalizeModel() method with parseModelSpec delegation and provider validation ([beeb0b0](https://github.com/groundswell-ai/groundswell/commit/beeb0b089c8cb5e21e5a7fcc9f4a04bd8c391b0b))
* complete AnthropicProvider registerMCPs() method with MCPHandler integration and SDK config storage ([a8e75b1](https://github.com/groundswell-ai/groundswell/commit/a8e75b16b567804d2248955c28d299e26e473af7))
* complete AnthropicProvider terminate() method with idempotent SDK cleanup and ProviderRegistry integration ([4782c2f](https://github.com/groundswell-ai/groundswell/commit/4782c2f6c96061ddafe239f22100d4eab477d9df))
* complete automatic validation hook integration with workflow context step() method validation, invalidResponse event emission, and configuration control ([513f915](https://github.com/groundswell-ai/groundswell/commit/513f9159cf24249c958198c1d7586b17c0d7ffbb))
* complete automatic validation integration tests with comprehensive agent workflow scenariosAdd comprehensive integration tests covering valid/invalid agent responses,event emission, configuration control, graceful error handling, and bothclass-based (@Step) and functional (ctx.step()) workflow patterns. ([268a45a](https://github.com/groundswell-ai/groundswell/commit/268a45a453ae064d83f4a1623a970c69b21b514b))
* complete comprehensive error code handling test suite with PRD 6.2 compliance and retry logic validation ([08548a6](https://github.com/groundswell-ai/groundswell/commit/08548a68c86ca88fea0199b7158bd8eabe0e399b))
* complete comprehensive event history configuration with trimming options and replay functionality ([66e16fa](https://github.com/groundswell-ai/groundswell/commit/66e16fa03deb78949425d1cc6eac2d4ab515bcd8))
* complete comprehensive JSDoc clarity improvement across all public API files with explicit defaults, required/optional status, and side effect documentation ([aa006fd](https://github.com/groundswell-ai/groundswell/commit/aa006fd556ec2294bcff1d39e1bb6e304dfe2622))
* complete comprehensive test coverage for AgentResponse schema validation with discriminated union refinement enforcement ([44b585c](https://github.com/groundswell-ai/groundswell/commit/44b585cbb039020c11db510018979092df0e53b9))
* complete comprehensive test coverage for provider capability query methods with supports() and requiresFeatures() in AnthropicProvider and OpenCodeProvider ([d41555d](https://github.com/groundswell-ai/groundswell/commit/d41555dafb80653615c973bce07eec6e13484cf0))
* complete comprehensive test coverage for workflow name security validation with control characters, XSS attacks, path traversal, file system characters, and constructor patterns ([f94c7aa](https://github.com/groundswell-ai/groundswell/commit/f94c7aa1a0f6a8fb51f6c72e89d8ea60c04d9e29))
* complete comprehensive test coverage for workflow-level error merge functionality with 30+ test cases covering default behavior, error collection, custom combine functions, and event emission ([6b7a6b9](https://github.com/groundswell-ai/groundswell/commit/6b7a6b98324bea7b8314e225d199e697b5bb9326))
* complete comprehensive unit tests for event replay functionality with full coverage and edge cases ([a92fe4e](https://github.com/groundswell-ai/groundswell/commit/a92fe4e554d5a842a12f228539c557971019d508))
* complete comprehensive workflow name security validation with control character, HTML/JS injection, path traversal, and file system character prevention ([1eb66c0](https://github.com/groundswell-ai/groundswell/commit/1eb66c0e2fb42c9960644d41aa65e15bdf3a2e7f))
* complete ErrorCriterion type definition with comprehensive discriminated union and StepOptions extension for restart configuration ([0f718ca](https://github.com/groundswell-ai/groundswell/commit/0f718ca273c5f2a941439aab822e279efca3539c))
* complete event history storage and replay functionality with comprehensive test coverage ([1cda3aa](https://github.com/groundswell-ai/groundswell/commit/1cda3aae107d424be201bf1c53769e5e0d7f9923))
* complete example completion indicators and event stream refinement for attach/detach operations ([1b99800](https://github.com/groundswell-ai/groundswell/commit/1b998000d69b143bf686405644538ee37701b782))
* complete example files AgentResponse handling documentation update ([3702b6c](https://github.com/groundswell-ai/groundswell/commit/3702b6c12af033e731c6ec477b3017617356b08e))
* complete example scripts verification and test all workflows with AgentResponse ([fdd40c1](https://github.com/groundswell-ai/groundswell/commit/fdd40c19aeff04ad8d83bb010b11fad100fd8134))
* complete formatModelForProvider() function with cross-provider validation and comprehensive test coverage ([b4ecf53](https://github.com/groundswell-ai/groundswell/commit/b4ecf53c9644bd63f839469017b2b06c859ac81f))
* complete foundational provider types with ProviderId and ProviderCapabilities interfaces ([0db98b5](https://github.com/groundswell-ai/groundswell/commit/0db98b5a346fe303e2a3d22d3918195d87401cf8))
* complete getGlobalProviderConfig() accessor with null safety and default configuration ([06dcea0](https://github.com/groundswell-ai/groundswell/commit/06dcea0a697b1803850af78ab38f33e4b362e13c))
* complete GlobalHarnessConfig and model-spec parsing contract types with test coverage ([d15307e](https://github.com/groundswell-ai/groundswell/commit/d15307e198e071e7ba8c171df7d0008f43dbd7f8))
* complete integration test failure research and fix catalog with PRP validation and failure patterns ([caf23f4](https://github.com/groundswell-ai/groundswell/commit/caf23f4c84280e6fe7759e3141f9a2e9ea6215e8))
* complete integration tests for tree update consistency with comprehensive event emission coverage- Add 5+ new test cases to tree-mirroring.test.ts covering attachChild, detachChild, setStatus, snapshotState, and multiple sequential operations- Verify treeUpdated event emission for ALL state-changing methods in Workflow class- Implement event count verification for multiple operations (no batching/missing events)- Validate observer receives events via both onEvent and onTreeChanged callbacks with correct payloads- Add mixed sequential operation tests covering attach/detach combinations- Ensure type guards for discriminated union event type access- Update P2.M3.T1.S3 task status to Complete- Complete P2.M3 milestone with comprehensive 1:1 tree mirror invariant testing- Enable regression prevention for future treeUpdated event changes ([45a0137](https://github.com/groundswell-ai/groundswell/commit/45a0137af15cd3aedcf9539ebf43a1ee850955ef))
* complete JSDoc clarity improvement for trackTiming default behavior with explicit opt-out documentation ([a8e2c98](https://github.com/groundswell-ai/groundswell/commit/a8e2c98e61d778a06b7119fd08311f5231d77961))
* complete npm registry research for OpenCode SDK and document verified package information in external dependencies ([9ae7873](https://github.com/groundswell-ai/groundswell/commit/9ae7873fad1771c5fae4a9b0daeb0c21863af373))
* complete observer propagation tests for PRD Section 7 compliance ([725f911](https://github.com/groundswell-ai/groundswell/commit/725f911200fa2779c01e627988d7c25db5747337))
* complete OpenCode implementation strategy with architectural decision to use alternative approach due to fundamental tool execution mismatch ([7974c75](https://github.com/groundswell-ai/groundswell/commit/7974c75ae1f523032fb83036541079c83c128f05))
* complete OpenCode provider decision analysis with comprehensive option evaluation and recommendation ([1739d00](https://github.com/groundswell-ai/groundswell/commit/1739d0077bca3f0790d542bca7f0321015df2cc6))
* complete OpenCode provider deprecation with comprehensive migration guide and documentation updates- Add deprecation warnings to OpenCodeProvider.initialize() with one-time flag- Create comprehensive migration guide at docs/migration-opencode-removal.md- Update PRD.md to remove all OpenCode/multi-provider references- Update docs/providers.md with single-provider focus- Update examples/providers/README.md with Anthropic-only examples- Add deprecation notice comments to all OpenCode test files- Add deprecation warning test coverage- Update CHANGELOG.md with deprecation notice- Mark all OpenCode tests as DEPRECATED in preparation for v2.0.0 removal ([8762109](https://github.com/groundswell-ai/groundswell/commit/87621095878c1ba7a724780fb8013617889b9954))
* complete OpenCode SDK API documentation with comprehensive API signatures, architectural comparison, and implementation recommendations for P3.M1.T1.S3 decision ([d2a9754](https://github.com/groundswell-ai/groundswell/commit/d2a975484b326971f6bb51e55d1da8516b2cc193))
* complete OpenCodeProvider buildOpenCodeHooks() adapter function with SSE event support and comprehensive test coverage ([671b83c](https://github.com/groundswell-ai/groundswell/commit/671b83c0722be8d8a68051c6045307417c4b7e7c))
* complete OpenCodeProvider class structure with Provider interface implementation, SDK lazy loading, and stub methods ([1fd30ea](https://github.com/groundswell-ai/groundswell/commit/1fd30eab4cc95610e822e2fd891ecc8d0da2d92d))
* complete OpenCodeProvider execute() method with multi-provider support, hooks integration, and LLM-only mode ([9b5cea2](https://github.com/groundswell-ai/groundswell/commit/9b5cea2d651f1fd9f4fad4b10ae38c901448fcd8))
* complete OpenCodeProvider initialize() and terminate() methods with SDK lazy loading and server lifecycle management ([fabd72b](https://github.com/groundswell-ai/groundswell/commit/fabd72be4447e68c19dadba4a138c006a5fac5ba))
* complete OpenCodeProvider normalizeModel() method with multi-provider support and comprehensive test coverage ([bfba8b8](https://github.com/groundswell-ai/groundswell/commit/bfba8b833994134ddf6c478f947bca71eace425d))
* complete OpenCodeProvider registerMCPs() and loadSkills() methods with LLM-only mode, skills loading via system prompt injection, and comprehensive test coverage ([957d1a2](https://github.com/groundswell-ai/groundswell/commit/957d1a2f003c303d010681223aff97a448c32027))
* complete P1.M1.T1.S1 logger child signature research with comprehensive analysis ([f968cc4](https://github.com/groundswell-ai/groundswell/commit/f968cc4883a03c7806fa3af2874900485aba4a6a))
* complete P1.M1.T1.S2 logger child signature research with comprehensive analysis ([be4f301](https://github.com/groundswell-ai/groundswell/commit/be4f301be94664f1618eaf9049c94bd34c38049c))
* complete P1.M1.T1.S3 logger child signature research with comprehensive analysis ([9c0c34f](https://github.com/groundswell-ai/groundswell/commit/9c0c34f770d56d858f3ee22de2d3f41e36140afb))
* complete P1.M1.T1.S4 backward compatibility verification for logger child signature change ([8433e51](https://github.com/groundswell-ai/groundswell/commit/8433e51efcf20d26bc2e0fa360cd979af0072e09))
* complete P1.M2.T1 Promise.allSettled concurrent tasks with validation ([b21dd73](https://github.com/groundswell-ai/groundswell/commit/b21dd732f62052996d4cabb3bc4af405a6f514b5))
* complete P1.M2.T1.S1 Promise.all implementation analysis for @Task decorator ([6658f5e](https://github.com/groundswell-ai/groundswell/commit/6658f5e4d5d14c11f4abd7b49006cf7803ba9c90))
* complete P1.M2.T1.S2 Promise.allSettled implementation with error collection ([a019167](https://github.com/groundswell-ai/groundswell/commit/a019167dbdd2d7ca51c0ce3229a98400726f2b4f))
* complete P1.M2.T1.S3 concurrent task failure tests with comprehensive validation ([d27c59e](https://github.com/groundswell-ai/groundswell/commit/d27c59e0b03d09dca19482e3758a99d2186432a9))
* complete P1.M3.T2.S3 test validation and generate comprehensive test results report ([a876916](https://github.com/groundswell-ai/groundswell/commit/a8769161ee7b1b2760d18d8b09868c70d89f5f82))
* complete P1M1T1 agent response implementation research and factory function patterns ([c36c964](https://github.com/groundswell-ai/groundswell/commit/c36c9641601d1368198c0c38b6f49ff181e3b0d0))
* complete P1M2T2S1 errorMergeStrategy addition to TaskOptions interface ([9120cdb](https://github.com/groundswell-ai/groundswell/commit/9120cdbb7b69216a3e9504a61932675d121e3ec0))
* complete P1M2T2S2 errorMergeStrategy implementation with error aggregation logic ([8c939d3](https://github.com/groundswell-ai/groundswell/commit/8c939d3eb274950bf59051529b1766170e73d89e))
* complete P1M2T2S3 default error merger implementation with error utility extraction ([685b4b6](https://github.com/groundswell-ai/groundswell/commit/685b4b6c0c6ddd8ff3379506ec277649815a9cbb))
* complete P1M2T2S4 tests for ErrorMergeStrategy functionality with comprehensive validation ([6705a38](https://github.com/groundswell-ai/groundswell/commit/6705a38a0e1f646cb91e81dccc6369efdaff948a))
* complete P1M2T3S1 PRD section location research for @Step decorator trackTiming ([bc0e11d](https://github.com/groundswell-ai/groundswell/commit/bc0e11d40ac7af6f6473f89474bc47b826ef8a52))
* complete P1M2T3S2 PRD documentation for trackTiming default value ([19e611f](https://github.com/groundswell-ai/groundswell/commit/19e611f6974fb8d692ca71fab36313cae5f76a5b))
* complete P1M3T1S1 console.error inventory research with comprehensive categorization ([3f015a0](https://github.com/groundswell-ai/groundswell/commit/3f015a0528a1a519acf9707be9e4815fdb1e1931))
* complete P1M3T1S2 observer error console.error replacement with structured logging ([c572b41](https://github.com/groundswell-ai/groundswell/commit/c572b41ede2fa684d5a65ecb081fd2d51526fb40))
* complete P1M3T1S3 comprehensive observer error logging tests with onTreeChanged and console.error verification ([9159ba7](https://github.com/groundswell-ai/groundswell/commit/9159ba7bb89c50c4b13baeb2cbb91ae111cca3f8))
* complete P1M3T2S1 tree debugger onTreeChanged implementation analysis with comprehensive performance research ([e81648a](https://github.com/groundswell-ai/groundswell/commit/e81648aa074b1e160d34f5bbc1dcaa93a61323d1))
* complete P1M3T2S2 incremental node map update implementation with BFS subtree removal and performance optimization ([e08e14a](https://github.com/groundswell-ai/groundswell/commit/e08e14a021317fe1e92d16a66290ae29ba8c6398))
* complete P1M3T2S3 node map update benchmark tests with comprehensive performance validation ([cb7c320](https://github.com/groundswell-ai/groundswell/commit/cb7c32059bb20bab027534dcfc36ccc526ff28e5))
* complete P1M3T3S1 workflow name validation decision research with comprehensive analysis ([7211f85](https://github.com/groundswell-ai/groundswell/commit/7211f85b541318dbe8000142b17e6594344b68b6))
* complete P1M3T3S2 workflow name validation constructor implementation with comprehensive error handling ([d3b2964](https://github.com/groundswell-ai/groundswell/commit/d3b296430f4c7448f81f4c83f0d9922fecfdb1fa))
* complete P1M3T3S3 workflow name validation tests verification with comprehensive analysis ([5d6e530](https://github.com/groundswell-ai/groundswell/commit/5d6e5300a130c1fefc5c19c184b2a909e177a80e))
* complete P1M3T4S1 isDescendantOf API evaluation research with comprehensive industry analysis and security assessment ([0fbbdb9](https://github.com/groundswell-ai/groundswell/commit/0fbbdb9f665b94e5e1026970f9746c238de8df22))
* complete P1M3T4S2 isDescendantOf public API implementation with comprehensive documentation and security assessment ([f51ebb3](https://github.com/groundswell-ai/groundswell/commit/f51ebb37697c315de37fba4955c723b152a305d2))
* complete P1M3T4S3 isDescendantOf circular reference error tests with comprehensive validation ([4e95caf](https://github.com/groundswell-ai/groundswell/commit/4e95caf11e31ff711abe6817ed3908d13f9f8816))
* complete P1M4T1S1 test suite execution report with comprehensive validation ([0c12e81](https://github.com/groundswell-ai/groundswell/commit/0c12e81db464c173cc4abffa857ed312a05d69a4))
* complete P1M4T1S2 test suite validation with comprehensive documentation ([e75835e](https://github.com/groundswell-ai/groundswell/commit/e75835e0a338173d97db85b843b5a5c7ff92b69c))
* complete P1M4T2S1 bug fix summary documentation with comprehensive validation ([0302aef](https://github.com/groundswell-ai/groundswell/commit/0302aef4e490d09f79a3704f494f62e442c411c0))
* complete P1M4T2S2 changelog update for 0.0.3 release with comprehensive bug fix documentation ([f2d29a8](https://github.com/groundswell-ai/groundswell/commit/f2d29a86f9143dc434ba4fe25faeb1ae56b1004b))
* complete P1M4T2S3 release notes and changelog for attachChild integrity fix ([167ca10](https://github.com/groundswell-ai/groundswell/commit/167ca108d8967fae84223c2c3ceaa5c1c158fda6))
* complete P1M4T2S4 final validation checklist and release readiness for attachChild tree integrity fix ([cd093e8](https://github.com/groundswell-ai/groundswell/commit/cd093e858fe0f33a78b8e71adedce963cce9ea93))
* complete P1M4T3S1 breaking changes audit report with comprehensive semver analysis ([3d12b0c](https://github.com/groundswell-ai/groundswell/commit/3d12b0cfd82a25d2871384072bad291626d40ede))
* complete P1M4T3S2 backward compatibility test suite with comprehensive validation ([b5d8c69](https://github.com/groundswell-ai/groundswell/commit/b5d8c69251ccff72cb0281aeff3ae6cb0ccc9c73))
* complete P5.M1.T3.S1 testing documentation with PRP, research notes, and test coverage validation ([3b36e68](https://github.com/groundswell-ai/groundswell/commit/3b36e68378345074471961730b4f399473b0d322))
* complete parent-child restart integration tests demonstrating full error propagation analysis and re-execution flow ([f3ee3bc](https://github.com/groundswell-ai/groundswell/commit/f3ee3bc62549b88c847254a87b95e8da0238564b))
* complete parseModelSpec unit tests with comprehensive coverage including qualified format, plain format, error cases, and type safety verification ([8cfba03](https://github.com/groundswell-ai/groundswell/commit/8cfba0340fdbef1c553936289576196d18927b76))
* complete parseModelSpec() function with comprehensive validation and unit tests ([8983e8d](https://github.com/groundswell-ai/groundswell/commit/8983e8ddc105d83f67f3347e2e3ae1c9a77d5e30))
* complete performance regression testing for isDescendantOf method ([c18727c](https://github.com/groundswell-ai/groundswell/commit/c18727c564dfe892327c3ea52efeddd8fcd3faf5))
* complete PRD documentation update with AgentResponse type migration and comprehensive examplesUpdate PRD.md Section 7.3 Provider interface to reflect AgentResponse<T> return type instead of deprecated ProviderResult<T>. Add migration note explaining the type change from ProviderResult to AgentResponse with version information (v1.5.0), removal plan (v2.0.0), and clear migration guidance. Include AgentResponse<T> example demonstrating type-safe data access pattern. Ensure documentation matches actual implementation in src/types/providers.ts and references Section 6 for complete AgentResponse interface definition. ([18a8278](https://github.com/groundswell-ai/groundswell/commit/18a827848d2870d2baa477394ebfa2cadf9c5f2b))
* complete PRD Section 12.2 compliance tests for tree integrity requirements ([b8b48cf](https://github.com/groundswell-ai/groundswell/commit/b8b48cf5bdfb002a116663ed32c6065ac602a3b3))
* complete PRD v1.2 harness/provider split with orthogonal selection ([8de5961](https://github.com/groundswell-ai/groundswell/commit/8de59619beb985419ec08d12a442e1b19e5e2ae8))
* complete provider capability query helpers with supports() and requiresFeatures() methods in Provider interface and implementations ([dc887d8](https://github.com/groundswell-ai/groundswell/commit/dc887d83e18ce7e9da6245597426936aab7fcf8b))
* complete Provider interface implementation with core methods, type-safe execute<T>(), and comprehensive documentation ([0dad1a4](https://github.com/groundswell-ai/groundswell/commit/0dad1a4814c737d40c75bb81d479a4610807f25d))
* complete Provider Interface type compatibility tests with comprehensive polymorphic validation and generic type parameter flow verificationAdd Type Compatibility describe block to provider-interface.test.ts verifying polymorphic assignment, AgentResponse<T> return type consistency, generic parameter preservation, multiple implementation interchangeability, compile-time type safety, and discriminated union type narrowing. Tests validate that Provider interface correctly enforces type contract for all implementations while supporting polymorphic usage patterns. ([4404b20](https://github.com/groundswell-ai/groundswell/commit/4404b2086dfdb18ae85cf5daf43566a46cf19b3e))
* complete provider lifecycle tests with comprehensive coverage for initializeAll() and terminateAll() methods ([989e183](https://github.com/groundswell-ai/groundswell/commit/989e1836e568cab82c9145c89c3436714f620922))
* complete provider switching integration tests with comprehensive coverage for multi-provider scenarios, configuration cascade priority, and state isolation validation ([67d11a7](https://github.com/groundswell-ai/groundswell/commit/67d11a7411a410f6fdb9d76f4c8bae383df45b9b))
* complete provider usage examples documentation with comprehensive executable examples and integration updates ([ea24197](https://github.com/groundswell-ai/groundswell/commit/ea241972419afeed194df025d234341a17b94cce))
* complete ProviderRegistry async initialization with status tracking and promise caching ([32b5b88](https://github.com/groundswell-ai/groundswell/commit/32b5b88f03cefb006bf5896c4eefe0f5a884a2e5))
* complete ProviderRegistry singleton and registration testing with comprehensive test coverage ([b3da0b2](https://github.com/groundswell-ai/groundswell/commit/b3da0b2d5d88055ff561a54de6381d17768b1593))
* complete ProviderRegistry singleton class with Map-based provider management and comprehensive testing ([18c38fa](https://github.com/groundswell-ai/groundswell/commit/18c38fa7d9d98cca6e21fca9ff0e44246599f02e))
* complete ProviderRegistry terminateAll() method with parallel provider termination and error-tolerant cleanup ([fe6b43e](https://github.com/groundswell-ai/groundswell/commit/fe6b43e35d9a19636bc3235fa8201a4c02b1d73e))
* complete ProviderResult type deprecation with comprehensive JSDoc comments and migration guidanceAdd [@deprecated](https://github.com/deprecated) JSDoc to ProviderResult<T> and related types (ProviderResponseStatus, ProviderErrorDetails, ProviderResponseMetadata) with clear migration path to AgentResponse equivalents. Include version information (v1.5.0) and removal plan (v2.0.0). All types preserve existing structure while providing [@see](https://github.com/see) links to replacements and migration examples. ([59f9e68](https://github.com/groundswell-ai/groundswell/commit/59f9e68d2e4e835e22a650271dfe2d0efd623cd5))
* complete ProviderResult, ModelSpec verification, and GlobalProviderConfig interfaces with comprehensive type system ([96eb9f0](https://github.com/groundswell-ai/groundswell/commit/96eb9f004c3f47457f7234c87ea4b6b6ea823695))
* complete providers.md API reference documentation with comprehensive type definitions, configuration functions, model specification utilities, and provider registry class documentation ([11bb955](https://github.com/groundswell-ai/groundswell/commit/11bb955610c738b30336ebbf36e7f6663ee8440c))
* complete providers.md documentation with comprehensive provider system overview, configuration cascade, and API reference ([6e7cc44](https://github.com/groundswell-ai/groundswell/commit/6e7cc446ce936ee7080d295d45b3a97cfa01d3f1))
* complete PRP-003 verification for configuration cascade tests with comprehensive test coverage validation ([a2d2a60](https://github.com/groundswell-ai/groundswell/commit/a2d2a6013e086a5430577cf857aaafc7940699bc))
* complete reactive workflow tree debugger with Ink components and real-time updates ([962cae9](https://github.com/groundswell-ai/groundswell/commit/962cae9668b383d455ebe881bad04c0aa832218d))
* complete README.md migration to AgentResponse<T> with status checking examples and migration guide link ([44985c1](https://github.com/groundswell-ai/groundswell/commit/44985c10dc5de1b8fbbed60bda189aa4f1a2e79f))
* complete resolveProviderConfig() cascade utility with nullish provider resolution and object spread options merge ([7ab1cbe](https://github.com/groundswell-ai/groundswell/commit/7ab1cbeecb656658511b7209f370c92ebc8ff6f2))
* complete restart pattern documentation with comprehensive implementation guide and parent-child examples ([86146ab](https://github.com/groundswell-ai/groundswell/commit/86146abcd79d26fc17ed7e690ea92963e7924ed0))
* complete restartStep method implementation with step restart capability, event emission, and retry tracking ([4154f9d](https://github.com/groundswell-ai/groundswell/commit/4154f9d51fc153d12d9f6386a922a495cf88ce97))
* complete session configuration options for ProviderOptions with declarative persistence and backward compatibility- Add sessionPersistence?: 'memory' | 'file' | 'redis' to ProviderOptions interface for easy storage type selection- Add sessionTtl?: number for future TTL enforcement (forward compatible with P2.M2.T2.S2)- Add sessionPath?: string with default './sessions' for file-based storage- Update AnthropicProvider.initialize() to create SessionStore instances from simple string configuration- Implement priority: sessionStore (direct injection) > sessionPersistence (declarative) > default MemorySessionStore- Maintain complete backward compatibility with existing sessionStore property- Add comprehensive test coverage for all configuration combinations- Add .gitignore entry for sessions/ directory- Provide clear error messages for unsupported Redis configuration- Enable file persistence across provider lifecycle (initialize → terminate → initialize) ([e7d1fbe](https://github.com/groundswell-ai/groundswell/commit/e7d1fbe228a3643e4dbc3ba13cd7a26abf9a17df))
* complete session persistence documentation with comprehensive guide and lifecycle coverage- Add complete \ ([04edcad](https://github.com/groundswell-ai/groundswell/commit/04edcad00bd1c6de7fd66dcc89cfa13841a2ae1c))
* complete session serialization utilities with comprehensive SDK message support- Add serializeSession() and deserializeSession() utilities with circular reference handling- Implement custom replacer function for non-serializable values (functions, Symbols)- Add SessionSerializationError with detailed error context and path information- Include comprehensive test coverage for round-trip serialization scenarios- Export utilities from src/utils/index.ts for easy access- Handle unknown type fields in SDK messages with graceful serialization- Provide type validation during deserialization to catch malformed data- Support edge cases including deeply nested structures and special characters- Add SDK message compatibility tests for realistic usage patterns ([8d550bd](https://github.com/groundswell-ai/groundswell/commit/8d550bd0ccd8055c22c075a2b59b4c1e484236cd))
* complete session TTL enforcement with timestamps cleanup and documentation- Extend SessionState with createdAt and lastAccessedAt timestamps- Implement lazy expiration on load and active cleanup in FileSessionStore- Add deleteExpired() method to SessionStore interface- Update AnthropicProvider to pass sessionTtl and call cleanup on initialize- Handle edge cases: zero TTL, legacy sessions, clock skew with 60s tolerance- Add comprehensive test coverage for TTL behavior across all stores- Include session persistence documentation in docs/providers.md ([505529e](https://github.com/groundswell-ai/groundswell/commit/505529e6368add523941cdb9b7c230fd2e2246ab))
* complete SessionStore integration with pluggable storage backends and session persistence- Replace AnthropicProvider's Map<string, SessionState> with SessionStore<SessionState>- Add constructor injection with optional sessionStore parameter (defaults to MemorySessionStore)- Implement session restoration in initialize() for non-memory stores- Add session persistence in terminate() for persistent backends- Delegate all session operations (createSession, getSession, deleteSession) to SessionStore API- Maintain backward compatibility - no sessionStore provided uses in-memory storage- Add comprehensive test coverage for file persistence, multiple sessions, and custom stores- Add async session methods with proper error handling- Support session mutation persistence for FileSessionStore- Add sessionStore type detection to distinguish memory from persistent stores ([565cb40](https://github.com/groundswell-ai/groundswell/commit/565cb400d8f01581c80dc5e7cfc970b2f5c5c0f6))
* complete SessionStore interface and implementations with pluggable storage backends- Define SessionStore<T> interface with async CRUD operations for session persistence- Implement MemorySessionStore<T> maintaining backward compatibility with existing Map usage- Implement FileSessionStore<T> with JSON persistence and atomic file writes- Add RedisSessionStore<T> interface stub for future distributed storage- Export SessionState type from types/providers.ts for shared session management- Add comprehensive test coverage for all implementations with error handling scenarios- Enable pluggable session storage while preserving existing AnthropicProvider behavior- Support multiple persistence backends: in-memory (default), file-based, and future Redis ([fd957d6](https://github.com/groundswell-ai/groundswell/commit/fd957d6ee6155b39b6cce584ee8bcdf321ac3261))
* complete split-pane debugger UI with node details panel, state redaction, and keyboard navigation ([87d5a1a](https://github.com/groundswell-ai/groundswell/commit/87d5a1a8c9301f0fdb8eaa46c8614f6df9a60096))
* complete Step decorator retry loop implementation with comprehensive retry logic, event emission, and error criterion matching ([e9a53b9](https://github.com/groundswell-ai/groundswell/commit/e9a53b9198d52454b4c29ee3627129f9b9cf69e0))
* complete step restart decorator tests with comprehensive retry logic validation, event emission verification, and error criteria matching ([3041774](https://github.com/groundswell-ai/groundswell/commit/30417741515f884f6daa0ce49a775356c423ceff))
* complete step restart decorator tests with retry delay adjustment and status updates ([874b9e0](https://github.com/groundswell-ai/groundswell/commit/874b9e01db015392cdb2905a3f85896b8925db3e))
* complete stepRestarted event type with timestamp and restoredState properties ([2a8526f](https://github.com/groundswell-ai/groundswell/commit/2a8526fcdfa62427fb967c3d08ca6b903ab505d9))
* complete stepRetry event type implementation with discriminated union and timestamp support ([a8e866d](https://github.com/groundswell-ai/groundswell/commit/a8e866ddeba6b577e2d89cb92106fb498f6f3695))
* complete test files with AgentResponse assertions following PRD 6.4.4 null handling patterns ([c306a68](https://github.com/groundswell-ai/groundswell/commit/c306a681a5451dcfb278017c2f3051312b242855))
* complete test suite validation with AgentResponse migration and performance fixes ([85a7b2d](https://github.com/groundswell-ai/groundswell/commit/85a7b2db9a5f772d2c590de1c80658e75eb1818a))
* complete ToolExecutionRequest, ToolExecutionResult, and ProviderHookEvents interfaces verification and validation ([85a39e0](https://github.com/groundswell-ai/groundswell/commit/85a39e008c7fa47adf674c7c32b0d02cc4ad1cb3))
* complete treeUpdated audit documentation with comprehensive state-changing method analysis and event emission inventory- Create comprehensive audit document at plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md- Document all 12 state-changing methods in Workflow class with treeUpdated emission status- Identify critical gaps: attachChild() and detachChild() missing treeUpdated emissions- Include code snippets for each method showing current implementation- Categorize methods by emission consistency (YES/INDIRECT/MISSING/NO STATE)- Document impact of missing events on 1:1 tree mirror invariant- Add research summaries covering observer patterns, tree mirroring invariant, and event patterns- Update P2.M3.T1.S1 task status to Complete and P2.M3.T1.S2 status to Researching- Provide foundation for fixing PRD Issue [#6](https://github.com/groundswell-ai/groundswell/issues/6) Missing TreeUpdated Event on State Changes ([47ca207](https://github.com/groundswell-ai/groundswell/commit/47ca207091cb68a5f69999d468a3ac694a398d9c))
* complete treeUpdated event emission for Workflow tree structure methods- Add treeUpdated event to attachChild() and detachChild() in src/core/workflow.ts- Update JSDoc comments to document treeUpdated event emission- Fix P2.M3.T1.S2 subtask status to Complete- Enable 1:1 tree mirror guarantee for structural changes- Ensure TreeDebugger receives accurate real-time updates for tree modifications- Align event emission patterns with industry best practices (emit after state change) ([4afc78f](https://github.com/groundswell-ai/groundswell/commit/4afc78f2d32bc240c6892f0da39f7217c8d2c234))
* complete TypeScript compilation validation for childDetached event type ([ca8e568](https://github.com/groundswell-ai/groundswell/commit/ca8e56849a121582fc3d06aa6ef8f3ddc7dbf6c4))
* complete TypeScript compiler verification and fix AgentResponse type errors with PRD 6.4 compliance ([392cbd5](https://github.com/groundswell-ai/groundswell/commit/392cbd59610f4477d68f9d596c53b0958bcaa1d6))
* complete validateAgentResponse method implementation with comprehensive validation, event emission, and WorkflowError creation ([b5e3459](https://github.com/groundswell-ai/groundswell/commit/b5e3459530632ef36a493786343175ea820468b6))
* complete workflow-level error collection with configurable error merge strategy support ([d1d9638](https://github.com/groundswell-ai/groundswell/commit/d1d9638be5b856f0eb8fbe3ad336822b8282afd9))
* complete WorkflowConfig interface extension with errorMergeStrategy field support ([93d7f13](https://github.com/groundswell-ai/groundswell/commit/93d7f137eebeaccea3b9609e6478f4faf28632f5))
* complete WorkflowEventReplayer implementation with tree structure event replay logic ([c24aba7](https://github.com/groundswell-ai/groundswell/commit/c24aba7e7daf9be207dd88e5ec69f9c38732c169))
* complete WorkflowEventReplayer interface definition with comprehensive JSDoc documentation and event handling strategy ([b86b7fc](https://github.com/groundswell-ai/groundswell/commit/b86b7fce2d6903cd1cc9a68f31eacf6208307da1))
* complete WorkflowEventReplayer state event handling with snapshot tracking and error accumulation ([86235ea](https://github.com/groundswell-ai/groundswell/commit/86235ea701908d8bbe76e93c47ee933afe73a552))
* complete WorkflowTree expand/collapse functionality with keyboard navigation and smart defaults ([20d2175](https://github.com/groundswell-ai/groundswell/commit/20d21758fa7b2b0d8952141e25589f953f0d9cde))
* complete WorkflowTreeDebugger event persistence with file-based save/load capabilities ([0eba88a](https://github.com/groundswell-ai/groundswell/commit/0eba88ad25977542fc1ade361def0180c0ececa2))
* complete WorkflowTreeDebugger time-travel debugging with static replay API and comprehensive integration tests ([0a7bb62](https://github.com/groundswell-ai/groundswell/commit/0a7bb6268da6420f7ad8edd49ebced2a2de6034d))
* complete Zod refinement validation for AgentResponse schema to enforce runtime consistency between status and data/error fields with comprehensive test coverage ([9aed9b9](https://github.com/groundswell-ai/groundswell/commit/9aed9b9b1e0e11c8e0257975c2e6756399f14b10))
* convert Provider* types to deprecated Harness* alias shim with migration tests ([9660f2f](https://github.com/groundswell-ai/groundswell/commit/9660f2f639278a1a7f034fc115ce395c02b71da8))
* delete OpenCodeProvider, narrow ProviderId, and scrub opencode literal from src/ ([79e05f9](https://github.com/groundswell-ai/groundswell/commit/79e05f932356dcdf01dd834cf5489c5b68bdd903))
* deprecate PromptOverrides provider fields with migration JSDoc and type test ([47f93a1](https://github.com/groundswell-ai/groundswell/commit/47f93a1a8414c63233df1f2d97fd36fc4f201a1b))
* expand documentation with comprehensive guides for agents, prompts, and workflows ([c4d8b0b](https://github.com/groundswell-ai/groundswell/commit/c4d8b0b20f7a4019f54884850ec0b4a0bd3a38bf))
* export harness surface and model-spec utilities from public API barrel ([7669d2d](https://github.com/groundswell-ai/groundswell/commit/7669d2dcc7cee904b2c461a0b207bf7582bbbe2e))
* extend AgentConfig interface with provider fields and configuration cascade support ([22751cc](https://github.com/groundswell-ai/groundswell/commit/22751cce65ec79c9bfd21f5a87e308b7c514aff6))
* extend cache key with optional harness and provider isolation axes ([a96289e](https://github.com/groundswell-ai/groundswell/commit/a96289ed05b666245e2524b7bb5524964d9e9a4f))
* fix empty logs array in runFunctional() error handler with actual log entries ([22a41a0](https://github.com/groundswell-ai/groundswell/commit/22a41a0396f0d54b6e759272eb03fda579863c56))
* fix empty state object in runFunctional() error handler ([a1e5a3a](https://github.com/groundswell-ai/groundswell/commit/a1e5a3a88deaa6aaca4d0488926a7c559dac94e5))
* fix second error handler in replaceLastPromptResult() method with actual state and logs capture ([3214fff](https://github.com/groundswell-ai/groundswell/commit/3214fff29c7eff99e3e3c1a43c9b092d3415259b))
* formalize AgentConfig harness migration JSDoc and type-validation tests ([ff4f0df](https://github.com/groundswell-ai/groundswell/commit/ff4f0df2c08ac85760a72e644764cfa0e2bbe9c0))
* implement agent/prompt foundation with hierarchy integration ([37f6062](https://github.com/groundswell-ai/groundswell/commit/37f606262cc31871e7825050aac003639fb2575f))
* implement analyzeErrorForRestart utility with transient error detection and restart decision logic ([1f82f9c](https://github.com/groundswell-ai/groundswell/commit/1f82f9c05977ddf159e41caed9238646d42d5f05))
* implement bidirectional consistency tests for dual tree structure ([eec93dc](https://github.com/groundswell-ai/groundswell/commit/eec93dcb0a59eb6a2ed48cc730933235e3ec34d7))
* implement configureProviders() function with provider validation and global config storage ([560cbd6](https://github.com/groundswell-ai/groundswell/commit/560cbd632cc47f19687d4e61bec30a58c6e5c63e))
* implement cycle detection in getRoot() method to prevent DoS attacks ([cd401e5](https://github.com/groundswell-ai/groundswell/commit/cd401e54498627b8b4186c0f8adf92be932e629e))
* implement cycle detection in getRootObservers method to prevent DoS attacks ([bbf4402](https://github.com/groundswell-ai/groundswell/commit/bbf440286e3d894631bc7106b710f7ff76d2954c))
* implement examples 7-10 with advanced agent features, sdk integration, and introspection tools ([e791451](https://github.com/groundswell-ai/groundswell/commit/e79145181a6b5d686ab1c2efef1de681c047bfef))
* implement global provider configuration storage module with private variable singleton pattern ([63f2e59](https://github.com/groundswell-ai/groundswell/commit/63f2e59fc1a47585e58547e0a35dbf49ce33fe72))
* implement hierarchical workflow orchestration engine This commit implements a complete hierarchical workflow orchestration engine with full observability and tree debugging capabilities. The implementation includes: - Core workflow engine with parent/child relationships and event emission - @Step, @Task, and @ObservedState decorators for declarative workflow definition - WorkflowTreeDebugger for real-time tree visualization and logging - Complete TypeScript interfaces and type definitions - Example TDDOrchestrator and TestCycleWorkflow implementations - Integration tests validating 1:1 tree mirroring of workflow execution - Zero runtime dependencies with modern TypeScript 5.2+ support The engine provides perfect 1:1 tree mirroring of workflow execution, automatic error introspection with state snapshots, and supports hierarchical workflows with concurrent child execution. ([9119bf1](https://github.com/groundswell-ai/groundswell/commit/9119bf1ab778f0aa97e99101f911dd889bd55bbe))
* implement JSON-Schema to TypeBox converter for Pi tool bridge ([8e916b8](https://github.com/groundswell-ai/groundswell/commit/8e916b8e0efdfed668040be19c28073560feff4d))
* implement MCPHandler.toPiCustomTools bridge and refactor PiHarness delegation ([9d2dd41](https://github.com/groundswell-ai/groundswell/commit/9d2dd413ce8466c80e8d7da39d5d42bee3b6437f))
* implement PiHarness native skill loading and default registration ([4b7dfdf](https://github.com/groundswell-ai/groundswell/commit/4b7dfdf4960d901c2a7d50962cdfa7868163db51))
* implement PiHarness non-streaming execute with event-stream result aggregation ([3681295](https://github.com/groundswell-ai/groundswell/commit/3681295ddfdbeb196659d658b0ed6d8edf791d6c))
* implement PiHarness streaming with async-queue bridge and StreamEvent mapping ([50282c7](https://github.com/groundswell-ai/groundswell/commit/50282c7671589b4e31148675a5af9b71cf92e0b1))
* Implement reflection, caching, and introspection systemsAdd core components:- LLMCache with deterministic SHA-256 key generation- ReflectionManager for multi-level self-correction- Introspection tools for hierarchy inspection- Factory functions for dynamic creation- Context revision without tree forkingPrerequisites for one-pass success (Examples 7-10) are now in place.Phase 3 & 4 implementation follows PRD sections 9, 10, 11, 12. ([871e97b](https://github.com/groundswell-ai/groundswell/commit/871e97b847b9b1d9314ffe18722ae4c99aff0c87))
* implement session storage in AnthropicProvider with SessionState interface, Map-based storage, createSession() and getSession() methods, and capabilities.sessions update ([bc8c70a](https://github.com/groundswell-ai/groundswell/commit/bc8c70aa818df6c6ced59aea6f4123e1a0d80159))
* integrate circular reference check into attachChild to prevent DAG violations ([e829e3f](https://github.com/groundswell-ai/groundswell/commit/e829e3f72d5de19be7a4c7db56c91f4ddbd1a54c))
* mark P1.M2 milestone as complete ([22d23da](https://github.com/groundswell-ai/groundswell/commit/22d23dad707df8e8174d5154a9477f9f11cfcb87))
* migrate Agent from Anthropic SDK to Claude Agent SDK with MCP integration and JSON Schema support ([5e263e9](https://github.com/groundswell-ai/groundswell/commit/5e263e9856721e6e515781d3f346f902ce208e7b))
* refactor Agent.prompt() to use provider abstraction layer with configuration cascade and tool delegation ([6aecc65](https://github.com/groundswell-ai/groundswell/commit/6aecc65feee7bb4f98c53f63a5ac3ef1058d8d09))
* relocate src/providers to src/harnesses with full import path rewrite ([af13ecf](https://github.com/groundswell-ai/groundswell/commit/af13ecf6c968b4a376aa2e7d27c7ce60af883034))
* rename AnthropicProvider to ClaudeCodeHarness with Harness interface alignment and normalizeModel fix ([c2f6986](https://github.com/groundswell-ai/groundswell/commit/c2f6986b799dd4bcfcad5b8631395ed412747fee))
* rename ProviderRegistry to HarnessRegistry with deprecated alias and path rewrite ([71a114a](https://github.com/groundswell-ai/groundswell/commit/71a114a60a546c898001e98120f992444206af1f))
* replace empty state object with getObservedState(this) in runFunctional() error handler ([3dd1bb3](https://github.com/groundswell-ai/groundswell/commit/3dd1bb3dd07ab7774c591cf7bc27afd5164660f6))
* rewire Agent to harness field and registry cascade ([07b4ae2](https://github.com/groundswell-ai/groundswell/commit/07b4ae2693925cf1a8a2767e0399dad6f7fb139b))
* rewrite model-spec parsing for open provider set with harness-qualified rejection ([d9d00c7](https://github.com/groundswell-ai/groundswell/commit/d9d00c752df0ba02b9da8e539fb499c049163cae))
* rewrite provider examples as harness examples with dual-cascade demos ([1ed8c16](https://github.com/groundswell-ai/groundswell/commit/1ed8c1629428521c5f0cbd6082d559472faa7829))
* scrub OpenCodeProvider from examples and mark migration doc complete ([ebd8cc1](https://github.com/groundswell-ai/groundswell/commit/ebd8cc1fb4f8414db9a469f7e07ba65882028435))
* swap agent harness resolution to new cascade singleton ([adbdc5c](https://github.com/groundswell-ai/groundswell/commit/adbdc5c4d68fed0fd600d0ddff999602a282b53b))
* thread harness and provider into executePrompt cache key build-site ([e4b7d82](https://github.com/groundswell-ai/groundswell/commit/e4b7d8290b2902c44ee10a11ae962c4e8c32a51d))
* update bug fix task statuses and documentation ([c98a98b](https://github.com/groundswell-ai/groundswell/commit/c98a98bccd264d34e5c20aed4ae6bc69617dfdd5))
* update P1.M1.T4.S1 task status to Complete ([8948576](https://github.com/groundswell-ai/groundswell/commit/8948576a15b95c92300541ab9d3a43a022b6f7d2))
* update P1.M2.T1.S2 task status to CompleteAdd invalidResponse event type to WorkflowEvent discriminated union with proper typing and integrationUpdate task status from Planned to Complete for the add invalidResponse event type subtaskin the bugfix session 001_45bfbada88e7, completing the event type definition for workflowresponse validation monitoring and debugging capabilities. ([bbdc76c](https://github.com/groundswell-ai/groundswell/commit/bbdc76cacf2014b879dbb89c31847d8ded0fe2c2))
* update provider documentation with package names and SDK version information ([3f471bf](https://github.com/groundswell-ai/groundswell/commit/3f471bf2a635f545f6df3e3802f6b232188f0849))
* update Provider.execute() interface and improve provider type safety with union return type support ([37a9061](https://github.com/groundswell-ai/groundswell/commit/37a90613e34b100d1cc5e73e08d5a2e3881c169c))
* update restartStep method task status from Planned to Complete ([ea7d22d](https://github.com/groundswell-ai/groundswell/commit/ea7d22d669643a0c1e4fad5aec0ed46e6cefdb77))
* update stepRetry event type with RestartAnalysis, timestamp, and stepName fields ([9a6987b](https://github.com/groundswell-ai/groundswell/commit/9a6987b6600b36c2090eb9cb0370745b84f01950))
* update task status from Planned to Complete for analyzeError method implementation ([15d125a](https://github.com/groundswell-ai/groundswell/commit/15d125a87bfa022612c506fa67f0adf1f05febb1))
* update task status from Planned to Complete for error analysis utility implementation ([f02c767](https://github.com/groundswell-ai/groundswell/commit/f02c767a84c2a9bdd949ec7dac0e136aede25a76))
* update task status from Planned to Complete for restart interfaces definition ([d7cd992](https://github.com/groundswell-ai/groundswell/commit/d7cd99281e910f2be632c1e4e6824c5db06d7d4d))
* update task status from Planned to Complete for stepRestarted event type implementation ([1ed36bc](https://github.com/groundswell-ai/groundswell/commit/1ed36bc3d936b7769b94617781f92f2d3ff65a49))
* update task status from Planned to Complete for workflow restart methods implementation ([4c774f3](https://github.com/groundswell-ai/groundswell/commit/4c774f39ccc7d634a01aa92c2fa4df35d186f206))
* verify emitEvent childDetached support and add comprehensive tests ([3553294](https://github.com/groundswell-ai/groundswell/commit/355329467bfd7a1f12ad6d6772ee2cc4e10b37e1))
* verify functional workflow error handler uses actual logs from this.node.logs ([9d36b95](https://github.com/groundswell-ai/groundswell/commit/9d36b958008eeaba25c12e96856f372b212d7e15))
* verify getObservedState import and error handler usage in workflow-context.ts ([1768f7f](https://github.com/groundswell-ai/groundswell/commit/1768f7f80e7311c20099544dbdb1312b5d91a284))
* verify second error handler usage in replaceLastPromptResult method ([a789f28](https://github.com/groundswell-ai/groundswell/commit/a789f285930b5391a8a2febb84924b6c4f55bbde))
* verify test regressions after circular reference integration ([b325103](https://github.com/groundswell-ai/groundswell/commit/b325103082f445f217db479cd23a9fc988c8b849))
* wire PiHarness lifecycle and registry-based model resolution ([6be7e7f](https://github.com/groundswell-ai/groundswell/commit/6be7e7f39e23b1159b6bd6c28583caa93ebd3bf7))
* wire PiHarness tool and stream hooks via shared fireHookEvents dispatcher ([4c8b573](https://github.com/groundswell-ai/groundswell/commit/4c8b573a159a8bb4ef0a7eba1acf311392f56f6f))
* wire PiHarness tool round-trip with registerMCPs forwarding and customTools delegation ([ab3f784](https://github.com/groundswell-ai/groundswell/commit/ab3f784449adc066243294809b157c8e516dc482))
* wire toolExecutor into PiHarness custom tool dispatch path ([9285d2a](https://github.com/groundswell-ai/groundswell/commit/9285d2afcc65e657822cc04b8183ad7e3008182c))
* write reparenting integration test for observer propagation validation ([a9539c5](https://github.com/groundswell-ai/groundswell/commit/a9539c58c63d42d88a6d8dbe54c13d089dc00f15))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-01-12

### Fixed

- **WorkflowLogger.child() signature** (Critical): Updated to accept `Partial<LogEntry>` parameter matching PRD specification, while maintaining backward compatibility with string-based API via function overloads.
  - Implementation: [src/core/logger.ts:98-111](src/core/logger.ts#L98-L111)
- **Promise.allSettled for concurrent tasks** (Major): Replaced `Promise.all()` with `Promise.allSettled()` for comprehensive error collection when multiple concurrent workflows fail, enabling aggregate error reporting.
  - Implementation: [src/decorators/task.ts:112-142](src/decorators/task.ts#L112-L142)
- **ErrorMergeStrategy implementation** (Major): Added error merge strategy for concurrent task failures with configurable custom combinators, enabling aggregation of all concurrent errors into a single WorkflowError.
  - Implementation: [src/types/decorators.ts:25-32](src/types/decorators.ts#L25-L32), [src/utils/workflow-error-utils.ts:23-56](src/utils/workflow-error-utils.ts#L23-L56)
- **Console.error to logger replacement** (Minor): Replaced `console.error()` with workflow logger for observer error handling, ensuring consistent structured logging throughout the codebase.
  - Implementation: [src/core/workflow.ts:426, 444](src/core/workflow.ts#L426)
- **Tree debugger optimization** (Minor): Implemented incremental node map updates for childDetached events using BFS traversal, avoiding O(n) full map rebuilds and improving performance on large workflow trees.
  - Implementation: [src/debugger/tree-debugger.ts:65-84, 92-117](src/debugger/tree-debugger.ts#L65-L84)
- **Workflow name validation** (Minor): Added validation for empty, whitespace-only, and overly long (>100 chars) workflow names to prevent invalid configurations.
  - Implementation: [src/core/workflow.ts:98-107](src/core/workflow.ts#L98-L107)
- **trackTiming default documentation** (Major): Clarified documentation that `trackTiming` in `@Step` decorator defaults to `true` via `!== false` check, improving API discoverability.
  - Implementation: [src/decorators/step.ts:94-101](src/decorators/step.ts#L94-L101)
- **isDescendantOf public API** (Minor): Made previously private `isDescendantOf()` helper method public with comprehensive JSDoc documentation, enabling workflow hierarchy validation and topology checking.
  - Implementation: [src/core/workflow.ts:201-219](src/core/workflow.ts#L201-L219)

### Added

- **Public isDescendantOf() method**: Made the previously private `isDescendantOf()` helper method public for workflow hierarchy validation, circular reference prevention, and topology checking.
  - Implementation: [src/core/workflow.ts:201-219](src/core/workflow.ts#L201-L219)

### Test Coverage

**New Test Files Added** (12 files):
- `src/__tests__/unit/logger.test.ts` - WorkflowLogger.child() signature tests (294 lines)
- `src/__tests__/adversarial/concurrent-task-failures.test.ts` - Concurrent task failure scenarios
- `src/__tests__/adversarial/error-merge-strategy.test.ts` - Error merge strategy functionality
- `src/__tests__/unit/tree-debugger-incremental.test.ts` - Incremental node map updates
- `src/__tests__/adversarial/node-map-update-benchmarks.test.ts` - Performance benchmarks
- `src/__tests__/integration/observer-logging.test.ts` - Observer logging tests
- `src/__tests__/unit/workflow.test.ts` - Workflow name validation
- `src/__tests__/unit/workflow-isDescendantOf.test.ts` - Public isDescendantOf API
- `src/__tests__/adversarial/parent-validation.test.ts` - Parent validation edge cases
- `src/__tests__/adversarial/circular-reference.test.ts` - Circular reference detection
- `src/__tests__/adversarial/complex-circular-reference.test.ts` - Deep circular reference scenarios
- `src/__tests__/integration/workflow-reparenting.test.ts` - Reparenting workflow tests

**Test Count Increase**: +50+ new test cases
**Regression Tests**: All existing tests continue to pass (100% pass rate maintained)

### Implementation Details

- **WorkflowLogger.child() signature fix**: [src/core/logger.ts:98-111](src/core/logger.ts#L98-L111)
  - Function overloads for type safety with both string and Partial<LogEntry> parameters
  - Backward compatible with existing string-based API
  - Follows PRD specification exactly
- **Promise.allSettled for concurrent tasks**: [src/decorators/task.ts:112-142](src/decorators/task.ts#L112-L142)
  - Captures all concurrent errors using Promise.allSettled()
  - Optional error merge strategy for aggregate error reporting
  - Backward compatible: throws first error by default
- **ErrorMergeStrategy implementation**: [src/types/decorators.ts:25-32](src/types/decorators.ts#L25-L32), [src/utils/workflow-error-utils.ts:23-56](src/utils/workflow-error-utils.ts#L23-L56)
  - New TaskOptions.errorMergeStrategy property
  - Default merger aggregates all error messages, logs, and workflow IDs
  - Custom combine function support for specialized error handling
- **Console.error to logger replacement**: [src/core/workflow.ts:426, 444](src/core/workflow.ts#L426)
  - Observer onEvent errors now logged with structured context
  - Observer onStateUpdated errors now logged with node context
- **Tree debugger optimization**: [src/debugger/tree-debugger.ts:65-84, 92-117](src/debugger/tree-debugger.ts#L65-L84)
  - Incremental subtree removal using BFS traversal
  - O(k) complexity for subtree operations instead of O(n)
  - Prevents stack overflow on deep trees with iterative BFS
- **Workflow name validation**: [src/core/workflow.ts:98-107](src/core/workflow.ts#L98-L107)
  - Rejects empty and whitespace-only names
  - Rejects names exceeding 100 characters
  - Fail-fast validation during construction
- **trackTiming default documentation**: [src/decorators/step.ts:94-101](src/decorators/step.ts#L94-L101)
  - Clarified that trackTiming defaults to true via !== false check
  - Explicit false disables timing, undefined/true enables timing
- **isDescendantOf public API**: [src/core/workflow.ts:201-219](src/core/workflow.ts#L201-L219)
  - Cycle detection during parent chain traversal
  - Comprehensive JSDoc with security warning and usage examples
  - Time/space complexity documentation

## [0.0.2] - 2026-01-12

### Fixed

- **attachChild() parent validation**: `attachChild()` now throws an Error if you attempt to attach a child that already has a different parent. Previously, this would silently create an inconsistent tree state where the child appeared in multiple parents' `children` arrays while only linking to one parent via its `parent` property.
- **Circular reference detection**: `attachChild()` now detects and prevents attaching an ancestor as a child, which would create a circular reference in the tree.
- **Observer event propagation**: Observer events now propagate correctly after reparenting operations. Previously, events from a shared child would only reach the original parent's observers, not any new parents.

### Added

- **New `detachChild()` method**: Enables proper reparenting workflow by removing a child from both the workflow tree (`this.children`) and the node tree (`this.node.children`), clearing the child's parent reference, and emitting a `childDetached` event.
  - Implementation: [src/core/workflow.ts:329-358](src/core/workflow.ts#L329-L358)
- **New `childDetached` event type**: Discriminated union member for detachment notifications, following the existing event pattern with `type`, `parentId`, and `childId` properties.
  - Implementation: [src/types/events.ts:11](src/types/events.ts#L11)
- **New `isDescendantOf()` helper**: Private method for circular reference detection that traverses the parent chain upward with cycle detection.
  - Implementation: [src/core/workflow.ts:151-169](src/core/workflow.ts#L151-L169)

### Migration Guide for attachChild() Behavior Change

**What Changed**:
The `attachChild()` method now throws an Error if you attempt to attach a child that already has a different parent. Previously, this would silently create an inconsistent tree state that broke observer propagation and violated the PRD's single-parent requirement.

**Before (Buggy Pattern)**:
```typescript
// This would silently create inconsistent state
const parent1 = new Workflow({ name: 'parent1' });
const parent2 = new Workflow({ name: 'parent2' });
const child = new Workflow({ name: 'child' });

parent1.attachChild(child);  // child.parent = parent1
parent2.attachChild(child);  // BUG: child still has parent1, but parent2 thinks it's attached
// Result: child.parent === parent1, but parent2.children.includes(child) === true
```

**After (Correct Pattern)**:
```typescript
// Use detachChild() before reattaching
const parent1 = new Workflow({ name: 'parent1' });
const parent2 = new Workflow({ name: 'parent2' });
const child = new Workflow({ name: 'child' });

parent1.attachChild(child);
parent1.detachChild(child);  // Explicitly detach first
parent2.attachChild(child);  // Now works correctly
// Result: child.parent === parent2, parent1.children does NOT include child
```

**Migration Steps**:
1. Search your code for patterns of attaching the same child to multiple parents
2. Add `detachChild()` calls before reattaching to a new parent
3. Test that your workflow tree operations complete without errors
4. Verify observer events propagate correctly after reparenting

### Test Coverage

**New Test Files Added** (12 files):
- `src/__tests__/unit/workflow-detachChild.test.ts` - `detachChild()` method tests
- `src/__tests__/unit/workflow-emitEvent-childDetached.test.ts` - `childDetached` event tests
- `src/__tests__/adversarial/parent-validation.test.ts` - Parent validation edge cases
- `src/__tests__/adversarial/circular-reference.test.ts` - Circular reference detection
- `src/__tests__/adversarial/complex-circular-reference.test.ts` - Deep circular reference scenarios
- `src/__tests__/adversarial/attachChild-performance.test.ts` - Performance validation
- `src/__tests__/adversarial/deep-hierarchy-stress.test.ts` - Deep nesting tests (1000+ levels)
- `src/__tests__/adversarial/bidirectional-consistency.test.ts` - Tree consistency tests
- `src/__tests__/adversarial/edge-case.test.ts` - Edge case coverage
- `src/__tests__/adversarial/observer-propagation.test.ts` - Observer propagation validation
- `src/__tests__/adversarial/deep-analysis.test.ts` - Comprehensive deep tree analysis
- `src/__tests__/integration/workflow-reparenting.test.ts` - Reparenting workflow tests

**Test Count Increase**: +25 new test cases
**Regression Tests**: All existing tests continue to pass (100% pass rate maintained)

### Implementation Details

- **attachChild() validation**: [src/core/workflow.ts:266-305](src/core/workflow.ts#L266-L305)
  - Validates child is not already attached to this workflow
  - Validates child does not have a different parent (throws with helpful error message)
  - Validates child is not an ancestor of this parent (circular reference detection)
- **detachChild() method**: [src/core/workflow.ts:329-358](src/core/workflow.ts#L329-L358)
  - Removes child from both workflow and node trees
  - Clears child's parent reference
  - Emits childDetached event for observer notification
- **isDescendantOf() helper**: [src/core/workflow.ts:151-169](src/core/workflow.ts#L151-L169)
  - Private helper method for circular reference detection
  - Traverses parent chain with Set-based cycle detection
- **childDetached event**: [src/types/events.ts:11](src/types/events.ts#L11)
  - Follows existing discriminated union pattern
  - Uses `childId` (string) instead of `child` (WorkflowNode) since child is no longer in tree

## [0.0.1] - 2025-01-10

### Added
- Initial release with hierarchical workflow engine
- `Workflow` base class with parent/child relationships
- Observer pattern for event propagation
- `WorkflowTreeDebugger` for real-time tree visualization
- `@Step`, `@Task`, and `@ObservedState` decorators
- Full TypeScript type definitions

[Unreleased]: https://github.com/dustin/groundswell/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/dustin/groundswell/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/dustin/groundswell/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/dustin/groundswell/releases/tag/v0.0.1
