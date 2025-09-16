/**
 * ETA Service
 * Responsible for calculating Estimated Time of Arrival (ETA) for multi-stage search processes.
 * Implements smoothing algorithm to prevent ETA fluctuations and provides real-time ETA updates.
 */

import type { StageProgress, ProcessingStage } from '../types/database.js';

/**
 * ETA calculation data for a single stage
 */
export interface StageETACalculation {
  stage: ProcessingStage;
  currentSpeed: number; // items per minute
  remainingItems: number;
  rawETA: number; // seconds
  smoothedETA: number; // seconds
  lastUpdate: Date;
  confidence: number; // 0-1, how confident we are in the ETA
}

/**
 * Overall ETA calculation for the entire process
 */
export interface OverallETACalculation {
  totalRemainingItems: number;
  totalEstimatedTime: number; // seconds
  stageBreakdown: StageETACalculation[];
  lastUpdate: Date;
  overallConfidence: number; // 0-1
}

/**
 * Speed tracking data point
 */
interface SpeedDataPoint {
  timestamp: Date;
  itemsProcessed: number;
  timeElapsed: number; // seconds
  speed: number; // items per minute
}

/**
 * Configuration for ETA calculations
 */
interface ETAServiceConfig {
  smoothingFactor: number; // Exponential smoothing factor (0.1-0.3 recommended)
  minimumDataPoints: number; // Minimum data points needed for reliable calculation
  maxHistoryLength: number; // Maximum number of data points to keep
  minimumSpeedThreshold: number; // Minimum speed (items/min) to consider valid
  confidenceDecayFactor: number; // How quickly confidence decays with time
}

export class ETAService {
  private readonly config: ETAServiceConfig;
  private speedHistory: Map<ProcessingStage, SpeedDataPoint[]> = new Map();
  private lastETACalculations: Map<ProcessingStage, StageETACalculation> = new Map();

  constructor(config: Partial<ETAServiceConfig> = {}) {
    this.config = {
      smoothingFactor: 0.2,
      minimumDataPoints: 3,
      maxHistoryLength: 10,
      minimumSpeedThreshold: 0.1,
      confidenceDecayFactor: 0.95,
      ...config,
    };
  }

  /**
   * Records processing progress for speed calculation
   * Should be called periodically during processing to track speed
   */
  recordProgress(
    stage: ProcessingStage,
    stageProgress: StageProgress,
    elapsedSeconds: number,
  ): void {
    if (stageProgress.itemsProcessed <= 0 || elapsedSeconds <= 0) {
      return; // Not enough data to calculate speed
    }

    const speed = (stageProgress.itemsProcessed / elapsedSeconds) * 60; // items per minute

    // Skip if speed is below threshold (likely invalid measurement)
    if (speed < this.config.minimumSpeedThreshold) {
      return;
    }

    const dataPoint: SpeedDataPoint = {
      timestamp: new Date(),
      itemsProcessed: stageProgress.itemsProcessed,
      timeElapsed: elapsedSeconds,
      speed,
    };

    // Get or create history for this stage
    const history = this.speedHistory.get(stage) ?? [];
    history.push(dataPoint);

    // Keep only recent history
    if (history.length > this.config.maxHistoryLength) {
      history.shift();
    }

    this.speedHistory.set(stage, history);
  }

  /**
   * Calculates ETA for a specific stage
   * Returns null if not enough data for reliable calculation
   */
  calculateStageETA(
    stage: ProcessingStage,
    stageProgress: StageProgress,
  ): StageETACalculation | null {
    const history = this.speedHistory.get(stage);
    if (!history || history.length < this.config.minimumDataPoints) {
      return null; // Not enough data points
    }

    const remainingItems = Math.max(0, stageProgress.itemsTotal - stageProgress.itemsProcessed);
    if (remainingItems === 0) {
      // Stage is complete
      return {
        stage,
        currentSpeed: 0,
        remainingItems: 0,
        rawETA: 0,
        smoothedETA: 0,
        lastUpdate: new Date(),
        confidence: 1.0,
      };
    }

    // Calculate current speed using exponential smoothing
    const currentSpeed = this.calculateSmoothedSpeed(history);

    if (currentSpeed <= 0) {
      return null; // Invalid speed calculation
    }

    // Raw ETA calculation: (remaining items / speed) * 60 seconds
    const rawETA = (remainingItems / currentSpeed) * 60;

    // Apply smoothing to the ETA calculation
    const previousETA = this.lastETACalculations.get(stage)?.smoothedETA ?? rawETA;
    const smoothedETA = this.applyExponentialSmoothing(previousETA, rawETA);

    // Calculate confidence based on data quality and consistency
    const confidence = this.calculateConfidence(history, currentSpeed);

    const calculation: StageETACalculation = {
      stage,
      currentSpeed,
      remainingItems,
      rawETA,
      smoothedETA,
      lastUpdate: new Date(),
      confidence,
    };

    // Store for future smoothing
    this.lastETACalculations.set(stage, calculation);

    return calculation;
  }

  /**
   * Calculates overall ETA for all stages combined
   */
  calculateOverallETA(
    stages: Record<ProcessingStage, StageProgress>,
    currentStage: ProcessingStage,
  ): OverallETACalculation {
    const stageBreakdown: StageETACalculation[] = [];
    let totalEstimatedTime = 0;
    let totalConfidence = 0;
    let validStages = 0;

    // Calculate ETA for each stage
    for (const [stageName, stageProgress] of Object.entries(stages) as Array<
      [ProcessingStage, StageProgress]
    >) {
      let stageETA: StageETACalculation | null = null;

      // Only calculate ETA for current and future stages
      if (stageName === currentStage || this.isStagePending(stageProgress.status)) {
        stageETA = this.calculateStageETA(stageName, stageProgress);
      } else if (stageProgress.status === 'completed') {
        // Completed stages have zero ETA
        stageETA = {
          stage: stageName,
          currentSpeed: 0,
          remainingItems: 0,
          rawETA: 0,
          smoothedETA: 0,
          lastUpdate: new Date(),
          confidence: 1.0,
        };
      }

      if (stageETA) {
        stageBreakdown.push(stageETA);
        totalEstimatedTime += stageETA.smoothedETA;
        totalConfidence += stageETA.confidence;
        validStages++;
      }
    }

    const overallConfidence = validStages > 0 ? totalConfidence / validStages : 0;

    return {
      totalRemainingItems: stageBreakdown.reduce((sum, calc) => sum + calc.remainingItems, 0),
      totalEstimatedTime,
      stageBreakdown,
      lastUpdate: new Date(),
      overallConfidence,
    };
  }

  /**
   * Calculates smoothed speed using exponential smoothing
   */
  private calculateSmoothedSpeed(history: SpeedDataPoint[]): number {
    if (history.length === 0) return 0;

    // Start with the most recent speed
    let smoothedSpeed = history[history.length - 1].speed;

    // Apply exponential smoothing to recent speeds (newest first)
    for (let i = history.length - 2; i >= 0; i--) {
      const currentSpeed = history[i].speed;
      smoothedSpeed =
        this.config.smoothingFactor * currentSpeed +
        (1 - this.config.smoothingFactor) * smoothedSpeed;
    }

    return smoothedSpeed;
  }

  /**
   * Applies exponential smoothing to ETA values
   */
  private applyExponentialSmoothing(previousValue: number, newValue: number): number {
    return (
      this.config.smoothingFactor * newValue + (1 - this.config.smoothingFactor) * previousValue
    );
  }

  /**
   * Calculates confidence in the ETA calculation based on data quality
   */
  private calculateConfidence(history: SpeedDataPoint[], currentSpeed: number): number {
    if (history.length < this.config.minimumDataPoints) {
      return 0.1; // Very low confidence with insufficient data
    }

    // Calculate speed variance (lower variance = higher confidence)
    const speeds = history.map((point) => point.speed);
    const meanSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / (speeds.length || 1);
    const variance =
      speeds.reduce((sum, speed) => sum + Math.pow(speed - meanSpeed, 2), 0) / (speeds.length || 1);
    const standardDeviation = Math.sqrt(variance);

    // Coefficient of variation (lower = more consistent = higher confidence)
    const coefficientOfVariation = meanSpeed > 0 ? standardDeviation / meanSpeed : 1;

    // Base confidence from data consistency
    let confidence = Math.max(0.1, Math.min(1.0, 1 - coefficientOfVariation));

    // Boost confidence for more data points
    const dataPointBonus = Math.min(0.3, (history.length - this.config.minimumDataPoints) * 0.1);
    confidence += dataPointBonus;

    // Reduce confidence if current speed is very different from historical average
    const speedDeviation = Math.abs(currentSpeed - meanSpeed) / meanSpeed;
    if (speedDeviation > 0.5) {
      confidence *= 0.7; // Reduce confidence by 30%
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Checks if a stage is pending (not yet started)
   */
  private isStagePending(status: string): boolean {
    return ['pending', 'paused', 'stopped'].includes(status);
  }

  /**
   * Resets all stored data for a specific stage
   * Useful when restarting a stage or clearing history
   */
  resetStageData(stage: ProcessingStage): void {
    this.speedHistory.delete(stage);
    this.lastETACalculations.delete(stage);
  }

  /**
   * Resets all stored data
   * Useful for starting fresh sessions
   */
  resetAllData(): void {
    this.speedHistory.clear();
    this.lastETACalculations.clear();
  }

  /**
   * Gets the current ETA calculation for a stage (if available)
   */
  getStageETA(stage: ProcessingStage): StageETACalculation | null {
    return this.lastETACalculations.get(stage) ?? null;
  }

  /**
   * Gets the processing speed history for a stage
   */
  getSpeedHistory(stage: ProcessingStage): SpeedDataPoint[] {
    return this.speedHistory.get(stage) ?? [];
  }

  /**
   * Formats ETA seconds into a human-readable string
   */
  static formatETA(seconds: number): string {
    if (seconds <= 0) return '0s';

    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
