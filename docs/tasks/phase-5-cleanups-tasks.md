# Phase 5: Architecture & Code Cleanups Tasks

Track progress for Phase 5 architecture & code cleanups issues (#21–#45).

## Group 5A: Registry-Driven Modular Routing & Layout
- [x] #30 [MEDIUM] Hardcoded Game Routing and Selection UI violates the Open/Closed Principle
- [x] #22 [MEDIUM] Tight Coupling between Global Layout Shell and Specific Game Routes
- [x] #25 [MEDIUM] Platform-Level Progressive Web App (PWA) Config Tightly Coupled to Single Game

## Group 5B: Decoupled Storage & Database Infrastructure
- [x] #37 [HIGH] Scattered and Direct Browser/Capacitor Storage access lacks a Central Storage Abstraction
- [x] #23 [MEDIUM] Tight Coupling of Game-Specific Database Schemas in Global Database
- [x] #26 [HIGH] Direct Database Coupling in Imposter Game UI (GameSetup.tsx)
- [x] #27 [HIGH] Direct Database Coupling in Imposter Game Controller (ImposterGame.tsx)
- [x] #28 [MEDIUM] Domain Logic Coupling to Database Infrastructure in Imposter dbSeeder
- [x] #29 [HIGH] Direct Database Coupling in Melodiq Gameplay Session (useSessionEnd.ts)
- [x] #45 [MEDIUM] Database Initializer locks React state rendering and blocking main UI thread

## Group 5C: Public API Encapsulation & Lints
- [x] #32 [MEDIUM] Missing Public API and Encapsulation for Melodiq Game Module
- [x] #33 [LOW] Missing Public API and Encapsulation for Werewolf Game Module
- [x] #34 [MEDIUM] Missing Public API and Encapsulation for Imposter Game Module
- [x] #35 [LOW] Lack of ESLint Module Boundary Enforcement Rules for Game Modules

## Group 5D: WebRTC API Routing & Connection Lifecycle
- [x] #36 [CRITICAL] Inline Fetch Calls Scattered across Game UIs Instead of Centralized API Client
- [x] #24 [HIGH] Generic Device Connection Component Coupled to Melodiq Implementation Details
- [x] #41 [HIGH] Unstable createManager Recreation inside React Render Cycles
- [x] #43 [MEDIUM] Memory and Listener Leaks in WebRTC Signaling Tracker

## Group 5E: State, Memory Leaks & Custom Role Engine
- [x] #21 [MEDIUM] Circular import between MelodiqSession component and usePassiveSync hook
- [x] #31 [HIGH] Werewolf Custom Role Setup and Save Logic Violates the Open/Closed Principle
- [x] #44 [HIGH] Werewolf Night action state remains persisted even after resetting game in LOBBY phase in Melodiq

ID: PHASE-5-CLEANUPS-TASKS
