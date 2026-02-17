/**
 * Plugin panel factory functions.
 *
 * Provides helpers to reduce boilerplate when registering sidebar panels.
 */

import type { ComponentType } from 'react';
import type { PanelConfig, PanelConditionContext } from '../types/panel';

/**
 * Creates a standard tool panel configuration.
 */
export function createToolPanel<TProps = unknown>(
  pluginId: string,
  component: ComponentType<TProps>,
  options?: {
    /** Custom condition for showing the panel. */
    condition?: (ctx: PanelConditionContext) => boolean;
    /** Custom key (defaults to pluginId). */
    key?: string;
  }
): PanelConfig {
  return {
    key: options?.key ?? pluginId,
    condition: options?.condition ?? ((ctx) =>
      !ctx.isInSpecialPanelMode && ctx.activePlugin === pluginId
    ),
    component,
  };
}

/**
 * Creates a settings panel configuration.
 */
export function createSettingsPanel<TProps = unknown>(
  key: string,
  component: ComponentType<TProps>,
  options?: {
    /** Additional condition beyond settings mode. */
    additionalCondition?: (ctx: PanelConditionContext) => boolean;
  }
): PanelConfig {
  return {
    key,
    condition: (ctx) => {
      if (!ctx.showSettingsPanel) {
        return false;
      }
      if (options?.additionalCondition) {
        return options.additionalCondition(ctx);
      }
      return true;
    },
    component,
  };
}

/**
 * Creates a conditional tool panel configuration.
 */
export function createConditionalToolPanel<TProps = unknown>(
  pluginId: string,
  component: ComponentType<TProps>,
  additionalCondition: (ctx: PanelConditionContext) => boolean,
  options?: {
    /** Custom key (defaults to pluginId). */
    key?: string;
  }
): PanelConfig {
  return {
    key: options?.key ?? pluginId,
    condition: (ctx) =>
      !ctx.isInSpecialPanelMode &&
      ctx.activePlugin === pluginId &&
      additionalCondition(ctx),
    component,
  };
}

/**
 * Creates a select-mode conditional panel configuration.
 */
export function createSelectModePanel<TProps = unknown>(
  key: string,
  component: ComponentType<TProps>,
  condition: (ctx: PanelConditionContext) => boolean
): PanelConfig {
  return {
    key,
    condition: (ctx) =>
      !ctx.isInSpecialPanelMode &&
      ctx.activePlugin === 'select' &&
      condition(ctx),
    component,
  };
}

/**
 * Creates a panel that shows in select mode or when no plugin is active.
 */
export function createSelectOrIdlePanel<TProps = unknown>(
  key: string,
  component: ComponentType<TProps>
): PanelConfig {
  return {
    key,
    condition: (ctx) =>
      !ctx.activePlugin || ctx.activePlugin === 'select',
    component,
  };
}

/**
 * Creates an always-visible panel configuration.
 */
export function createGlobalPanel<TProps = unknown>(
  key: string,
  component: ComponentType<TProps>,
  options?: {
    /** Condition for when to show (still respects special panel mode). */
    condition?: (ctx: PanelConditionContext) => boolean;
  }
): PanelConfig {
  return {
    key,
    condition: (ctx) => {
      if (ctx.isInSpecialPanelMode) {
        return false;
      }
      if (options?.condition) {
        return options.condition(ctx);
      }
      return true;
    },
    component,
  };
}
