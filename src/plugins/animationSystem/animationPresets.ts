import type { SVGAnimation } from './types';

export type AnimationSelectValue =
    | 'fade'
    | 'rotate'
    | 'move'
    | 'scale'
    | 'position'
    | 'size'
    | 'circleRadius'
    | 'linePoints'
    | 'pathData'
    | 'textPosition'
    | 'custom'
    | 'pathDraw'
    | 'fillColor'
    | 'strokeColor'
    | 'strokeWidth'
    | 'fontSize'
    | 'fontWeight'
    | 'letterSpacing'
    | 'filterBlur'
    | 'filterOffset'
    | 'filterColorMatrix'
    | 'filterFlood'
    | 'viewBox'
    | 'animateMotion'
    | 'animateMotionWithMPath'
    | 'patternSize'
    | 'patternTransform'
    | 'gradientStopColor'
    | 'gradientStopOffset'
    | 'gradientPosition'
    | 'linearGradient'
    | 'radialGradient'
    | 'set'
    | 'heartbeat'
    | 'shake'
    | 'slideIn'
    | 'popIn'
    | 'dashMarch'
    | 'blurIn'
    | 'saturate'
    | 'hueRotate'
    | 'flash'
    | 'elasticScale'
    | 'float'
    | 'pulseOpacity'
    | 'spinInfinite'
    | 'bounce'
    | 'glitch'
    | 'zoomIn'
    | 'slideRight'
    | 'slideUp'
    | 'swing'
    | 'flipX'
    | 'flipY'
    | 'unfold'
    | 'expandWidth'
    | 'shimmer'
    | 'vibrate'
    | 'fadeIn'
    | 'fadeOut'
    | 'slideDown'
    | 'slideLeft'
    | 'rotateIn'
    | 'rotateOut'
    | 'skewInfinite'
    | 'tilt'
    | 'jelly'
    | 'blurOut'
    | 'grayscale'
    | 'sepia'
    | 'brightnessPulse'
    | 'contrastPulse'
    | 'dropShadowPulse'
    | 'vanish'
    | 'expandHeight'
    | 'wave'
    | 'skewShake'
    | 'rainbowFill'
    | 'rainbowStroke'
    | 'blurPulse'
    | 'scalePulse'
    | 'rotatePulse'
    | 'swingHorizontal'
    | 'swingVertical'
    | 'slideInTop'
    | 'slideInBottom'
    | 'slideOutTop'
    | 'slideOutBottom'
    | 'bounceIn'
    | 'bounceOut'
    | 'tada'
    | 'pumping'
    | 'floatingX'
    | 'wiggle'
    | 'flashRed'
    | 'flashWhite'
    | 'strobe'
    | 'blink'
    | 'hueLoop'
    | 'saturatePulse'
    | 'brightnessLoop'
    | 'contrastLoop'
    | 'expandBoth'
    | 'skewXPulse'
    // Phase 5: Entrance (12)
    | 'slideInLeftBouncy' | 'slideInRightBouncy' | 'slideInTopBouncy' | 'slideInBottomBouncy'
    | 'slideInLeftElastic' | 'slideInRightElastic' | 'slideInTopElastic' | 'slideInBottomElastic'
    | 'zoomInBouncy' | 'zoomInElastic' | 'popInElastic' | 'rollIn'
    // Phase 5: Exit (12)
    | 'slideOutLeftBouncy' | 'slideOutRightBouncy' | 'slideOutTopBouncy' | 'slideOutBottomBouncy'
    | 'slideOutLeftElastic' | 'slideOutRightElastic' | 'slideOutTopElastic' | 'slideOutBottomElastic'
    | 'zoomOutBouncy' | 'zoomOutElastic' | 'popOutElastic' | 'rollOut'
    // Phase 5: Loops & Bounces (16)
    | 'bounceHeavy' | 'bounceLight' | 'vibrateHeavy' | 'vibrateLight'
    | 'floatDrift' | 'floatFigure8' | 'pulseSlow' | 'pulseFast'
    | 'heartbeatDouble' | 'ringingBell' | 'pendulum' | 'swingTop'
    | 'wobbleHard' | 'jelloX' | 'jelloY' | 'ping'
    // Phase 5: 3D-Like Transforms (16)
    | 'flipInX' | 'flipInY' | 'flipOutX' | 'flipOutY'
    | 'flip3D' | 'spinX' | 'spinY' | 'spinZ' | 'spinZCCW'
    | 'tiltUp' | 'tiltDown' | 'tiltLeft' | 'tiltRight'
    | 'doorOpen' | 'doorClose' | 'perspectiveRotateX' | 'perspectiveRotateY'
    // Phase 5: Filter Cycles & FX (16)
    | 'invertLoop' | 'grayscaleLoop' | 'sepiaLoop' | 'hueLoopFast'
    | 'blurSubtlePulse' | 'blurHeavyPulse' | 'focusAuto' | 'defocusAuto'
    | 'shadowDistanceLoop' | 'shadowAngleLoop' | 'shadowColorCycle'
    | 'noiseStatic' | 'glitchExtreme' | 'glitchSoft' | 'flareBrightness' | 'contrastBurn'
    // Phase 5: Colors & Styles (12)
    | 'rainbowFillSlow' | 'rainbowStrokeSlow' | 'fillFadePulse' | 'strokeFadePulse'
    | 'neonPulseRed' | 'neonPulseBlue' | 'neonPulseGreen' | 'neonPulseGold'
    | 'dashArrayCycle' | 'strokeWidthLoop' | 'drawInSlow' | 'drawOutSlow'
    // Phase 5: Interactive & UX States (12)
    | 'errorShake' | 'successPop' | 'loadingSpinSubtle' | 'activeStatePulse'
    | 'hoverLift' | 'hoverSink' | 'hoverExpand' | 'hoverContract'
    | 'focusOutlinePulse' | 'disabledStateGray' | 'urgentBlink' | 'notifyTip'
    // Phase 7: Liquid & Morph (20)
    | 'blobPulse' | 'liquidDrip' | 'waveShiftX' | 'waveShiftY' | 'morphElastic'
    | 'jellyWobbleX' | 'jellyWobbleY' | 'organicBreath' | 'liquidSway' | 'meltDown'
    | 'evaporateUp' | 'plasmaFlow' | 'amoebaStretch' | 'softBounceX' | 'softBounceY'
    | 'viscousDrag' | 'morphTilt' | 'bubblePop' | 'ripplingScale' | 'surfaceTension'
    // Phase 7: Advanced Typography (20)
    | 'charSpacingExpand' | 'charSpacingContract' | 'fontWeightThin' | 'fontWeightBold' | 'textSkewStretch'
    | 'textLetterJump' | 'textLineHeightPulse' | 'textWordPop' | 'textTypewriterFade' | 'textGhostScroll'
    | 'textRainbowChar' | 'textBlurFocus' | 'textShadowPulse' | 'textOutlineDraw' | 'textWaveform'
    | 'textJitter' | 'textPerspectiveRotate' | 'text3DSpinZ' | 'textFloatWave' | 'textExpandReveal'
    // Phase 7: Atmospheric & Natural (20)
    | 'windSwayLeft' | 'windSwayRight' | 'flameFlickerSubtle' | 'flameFlickerExtreme' | 'rainDropSingle'
    | 'leafFallSpiral' | 'floatingDustFast' | 'floatingDustSlow' | 'cloudDrift' | 'starTwinkle'
    | 'auroraWave' | 'smokeDrift' | 'waterRipple' | 'sunlightGlow' | 'moonlightFade'
    | 'crackleStatic' | 'thunderFlash' | 'mistSway' | 'snowFlakeTumble' | 'grassWaver'
    // Phase 7: Pattern & Gradient FX (20)
    | 'patternSlideX' | 'patternSlideY' | 'patternZoom' | 'patternRotateInfinite' | 'gradientShiftHorizontal'
    | 'gradientShiftVertical' | 'gradientRotate360' | 'gradientStopColorBlink' | 'gradientStopOffsetPulse' | 'shimmerOverlay'
    | 'patternFlowVertical' | 'patternFlowHorizontal' | 'gradientVignettePulse' | 'gradientGlowCenter' | 'patternSkewCycle'
    | 'patternDistort' | 'gradientContrastCycle' | 'gradientSaturationCycle' | 'patternOpacityPulse' | 'gradientAngleSweep'
    // Phase 7: Advanced UI/UX (20)
    | 'dragHintHorizontal' | 'dragHintVertical' | 'dropIndicatorPulse' | 'scanLineDown' | 'scanLineUp'
    | 'focusGlowPulse' | 'notifyShakeHard' | 'notifyShakeSoft' | 'errorBlinkRed' | 'successBlinkGreen'
    | 'savingSpinner' | 'uploadPulse' | 'downloadArrowFlow' | 'searchPulse' | 'buttonPressScale'
    | 'buttonReleaseSpring' | 'toggleSwitchGlide' | 'tooltipPop' | 'contextMenuReveal' | 'selectionGlow'
    // Phase 8: Geometric & Mathematical (20)
    | 'spiralGrowth' | 'sineWavePath' | 'fractalZoom' | 'geometricPulse' | 'squareRotateSubtle'
    | 'circleOrbit' | 'starExpand' | 'polygonShift' | 'gridExpand' | 'dotMatrixPulse'
    | 'lissajousMotion' | 'fibonacciSpiral' | 'tessellationFade' | 'kaleidoscopeSpin' | 'vectorDrift'
    | 'radialBurst' | 'concentricPulse' | 'hypocycloidDraw' | 'epiCycleMove' | 'goldenRatioScale'
    // Phase 8: Retro & Synthwave (40)
    | 'vhsGlitch' | 'neonFlickerFast' | 'neonFlickerSlow' | 'gridShiftZ' | 'scanlineInterference'
    | 'crtDistortion' | 'retroCyberSpin' | 'synthwavePulse' | 'arcadeFlash' | 'pixelateIn'
    | 'retroWaveScroll' | 'cyanMagentaSplit' | 'eightBitJump' | 'glitchBars' | 'staticNoiseOverlay'
    | 'retroZoom' | 'gridWarp' | 'pixelDrift' | 'eightBitFade' | 'retroShadowExtrude'
    | 'vhsColorBleed' | 'scanlineRoll' | 'crtScanlines' | 'retroGlowPulse' | 'analogDistortion'
    | 'cyberDrift' | 'synthShift' | 'arcadePop' | 'neonPathDraw' | 'retroTilt'
    | 'vintageSepiaFlicker' | 'oldFilmShake' | 'pixelStretch' | 'retroBounce' | 'eightBitSpin'
    | 'vhsPauseLine' | 'gridRotate' | 'neonFlickerExtreme' | 'retroWaveFloat' | 'cyberPulse'
    // Phase 8: Cinematic & Dramatic (40)
    | 'lensFlareDrive' | 'moodyFadeIn' | 'moodyFadeOut' | 'letterboxSlideIn' | 'letterboxSlideOut'
    | 'filmGrainOverlay' | 'panoramicSlow' | 'dramaticZoom' | 'cinematicSoftFocus' | 'anamorphicStretch'
    | 'slowMoReveal' | 'cameraShakeHeavy' | 'cameraShakeLight' | 'shutterBlink' | 'vignettePulse'
    | 'cinematicTiltShift' | 'filmIntroRoll' | 'creditScrollUp' | 'focusPull' | 'dramaticColorShift'
    | 'cinematicFadeBlack' | 'cinematicFadeWhite' | 'hollywoodZoom' | 'depthOfFieldBlur' | 'dramaticPush'
    | 'cinematicPanLeft' | 'cinematicPanRight' | 'noirContrast' | 'sepiaDrama' | 'overexposedFlash'
    | 'blueHourFade' | 'goldenHourGlow' | 'dramaticShadowLong' | 'cinematicLetterboxPulse' | 'motionBlurDrift'
    | 'slowRevealDraw' | 'cinematicIntroScale' | 'dramaticEntrance' | 'epicScaleUp' | 'heroicRotate'
    // Phase 8: Artistic & Sketchy (40)
    | 'pencilWobble' | 'watercolorBleed' | 'inkSplatPop' | 'brushStrokeDraw' | 'textureJive'
    | 'charcoalDrift' | 'pastelGlow' | 'markerScribble' | 'stippleFade' | 'crayonRoughEase'
    | 'artisticRoughEdges' | 'inkWashIn' | 'watercolorFadeOut' | 'sketchedLineDraw' | 'vibrantSplatter'
    | 'canvasTexturePulse' | 'oilPaintDrift' | 'acrylicPop' | 'sketchyPerspective' | 'artisticRoll'
    | 'inkDripSlow' | 'watercolorPulse' | 'pencilShade' | 'sketchyBounce' | 'scribbleExpand'
    | 'artisticFloat' | 'inkSpread' | 'watercolorWave' | 'pencilTilt' | 'sketchySpin'
    | 'markerStrokeIn' | 'stippleSpiral' | 'artisticSkew' | 'inkBurst' | 'watercolorShimmer'
    | 'pencilVibrate' | 'sketchyDrift' | 'markerWobble' | 'artisticSwing' | 'inkReveal'
    // Phase 8: Modern Minimalist UI (40)
    | 'microSlideIn' | 'microSlideOut' | 'smoothOvershoot' | 'subtleGlint' | 'cleanFocus'
    | 'edgeGlowPulse' | 'minimalistPop' | 'uiSoftReveal' | 'elegantSlide' | 'preciseScale'
    | 'subtleShadowHover' | 'cleanFadeIn' | 'minimalistBlink' | 'uiFloat' | 'smoothContract'
    | 'elegantRotate' | 'microBounce' | 'cleanPerspective' | 'uiScanLine' | 'subtleParallax'
    | 'modernGlowIn' | 'preciseDrift' | 'minimalistSkew' | 'uiSoftElastic' | 'cleanReveal'
    | 'elegantTilt' | 'microShift' | 'subtleExpansion' | 'modernShadowSweep' | 'uiGlassmorphismPulse'
    | 'cleanContract' | 'elegantFloat' | 'microScale' | 'subtlePulseIn' | 'modernReveal'
    | 'uiPrecisionMove' | 'cleanRotate' | 'elegantExpand' | 'microBlink' | 'subtleReveal'
    // Phase 8: Utility & Debug (20)
    | 'highlightCheckRed' | 'highlightCheckGreen' | 'boundaryPulse' | 'anchorSpin' | 'originMarker'
    | 'debugWireframePulse' | 'layoutGridFlash' | 'alignmentAssist' | 'elementTracker' | 'debugBlink'
    | 'rulerMarkDrift' | 'guideLineGlow' | 'paddingPulse' | 'marginPulse' | 'zIndexSwap'
    | 'opacityCheck' | 'sizeTracker' | 'positionTracker' | 'debugRotation' | 'idTagReveal';

export interface AnimationOption {
    value: AnimationSelectValue | string;
    label: string;
    category: string;
    applyTo: string[];
}

export const ANIMATION_CATEGORIES = ['All', 'Basic', 'Entrance', 'Exit', 'Loops', 'Liquid', 'Typography', '3D', 'Filters', 'Colors', 'Interactive', 'Paths', 'Natural', 'Geometric', 'Retro', 'Cinematic', 'Artistic', 'Minimalist', 'Specific'];
export const ANIMATION_APPLY_TO = ['All', 'generic', 'path', 'text', 'circle', 'line', 'filter', 'gradient', 'pattern', 'root'];

export const ANIMATION_TYPE_OPTIONS: AnimationOption[] = [
    { value: 'custom', label: 'Custom configuration', category: 'Basic', applyTo: ['generic'] },
    { value: 'fade', label: 'Fade (opacity)', category: 'Basic', applyTo: ['generic'] },
    { value: 'rotate', label: 'Rotate', category: 'Basic', applyTo: ['generic'] },
    { value: 'move', label: 'Move', category: 'Basic', applyTo: ['generic'] },
    { value: 'scale', label: 'Scale', category: 'Basic', applyTo: ['generic'] },
    { value: 'position', label: 'Position (x/y)', category: 'Basic', applyTo: ['generic'] },
    { value: 'size', label: 'Size (w/h)', category: 'Basic', applyTo: ['generic', 'circle'] },
    { value: 'pathDraw', label: 'Path draw (paths only)', category: 'Paths', applyTo: ['path'] },
    { value: 'pathData', label: 'Path data (paths only)', category: 'Paths', applyTo: ['path'] },
    { value: 'animateMotion', label: 'Animate motion', category: 'Basic', applyTo: ['generic'] },
    { value: 'animateMotionWithMPath', label: 'Animate motion (mpath id)', category: 'Basic', applyTo: ['generic'] },
    { value: 'circleRadius', label: 'Circle radius (circles only)', category: 'Specific', applyTo: ['circle'] },
    { value: 'linePoints', label: 'Line points (lines only)', category: 'Specific', applyTo: ['line'] },
    { value: 'textPosition', label: 'Text position (text only)', category: 'Specific', applyTo: ['text'] },
    { value: 'fillColor', label: 'Fill color (loop)', category: 'Colors', applyTo: ['generic'] },
    { value: 'strokeColor', label: 'Stroke color (loop)', category: 'Colors', applyTo: ['generic'] },
    { value: 'strokeWidth', label: 'Stroke width', category: 'Basic', applyTo: ['generic'] },
    { value: 'fontSize', label: 'Font size (text)', category: 'Specific', applyTo: ['text'] },
    { value: 'fontWeight', label: 'Font weight (text)', category: 'Specific', applyTo: ['text'] },
    { value: 'letterSpacing', label: 'Letter spacing (text)', category: 'Specific', applyTo: ['text'] },
    { value: 'filterBlur', label: 'Filter blur', category: 'Filters', applyTo: ['filter'] },
    { value: 'filterOffset', label: 'Filter offset', category: 'Filters', applyTo: ['filter'] },
    { value: 'filterColorMatrix', label: 'Filter color matrix', category: 'Filters', applyTo: ['filter'] },
    { value: 'filterFlood', label: 'Filter flood color', category: 'Filters', applyTo: ['filter'] },
    { value: 'patternSize', label: 'Pattern size', category: 'Specific', applyTo: ['pattern'] },
    { value: 'patternTransform', label: 'Pattern transform', category: 'Specific', applyTo: ['pattern'] },
    { value: 'gradientStopColor', label: 'Gradient stop color', category: 'Colors', applyTo: ['gradient'] },
    { value: 'gradientStopOffset', label: 'Gradient stop offset', category: 'Basic', applyTo: ['gradient'] },
    { value: 'gradientPosition', label: 'Gradient position', category: 'Basic', applyTo: ['gradient'] },
    { value: 'linearGradient', label: 'Linear gradient axes', category: 'Basic', applyTo: ['gradient'] },
    { value: 'radialGradient', label: 'Radial gradient axes', category: 'Basic', applyTo: ['gradient'] },
    { value: 'viewBox', label: 'ViewBox (root)', category: 'Basic', applyTo: ['root'] },
    { value: 'set', label: 'Set attribute', category: 'Basic', applyTo: ['generic'] },
    { value: 'heartbeat', label: 'Heartbeat (Scale)', category: 'Loops', applyTo: ['generic'] },
    { value: 'shake', label: 'Shake (Rotate)', category: 'Loops', applyTo: ['generic'] },
    { value: 'slideIn', label: 'Slide In (X)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'popIn', label: 'Pop In (Scale)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'dashMarch', label: 'Dash March (Stroke)', category: 'Loops', applyTo: ['generic'] },
    { value: 'blurIn', label: 'Blur In (Filter)', category: 'Entrance', applyTo: ['filter'] },
    { value: 'saturate', label: 'Saturate (Filter)', category: 'Filters', applyTo: ['filter'] },
    { value: 'hueRotate', label: 'Hue Rotate (Filter)', category: 'Filters', applyTo: ['filter'] },
    { value: 'flash', label: 'Flash (Opacity)', category: 'Loops', applyTo: ['generic'] },
    { value: 'elasticScale', label: 'Elastic Scale', category: 'Entrance', applyTo: ['generic'] },
    { value: 'float', label: 'Float (Y)', category: 'Loops', applyTo: ['generic'] },
    { value: 'pulseOpacity', label: 'Pulse Opacity', category: 'Loops', applyTo: ['generic'] },
    { value: 'spinInfinite', label: 'Spin Infinite', category: 'Loops', applyTo: ['generic'] },
    { value: 'bounce', label: 'Bounce (Y)', category: 'Loops', applyTo: ['generic'] },
    { value: 'glitch', label: 'Glitch Effect', category: 'Loops', applyTo: ['generic'] },
    { value: 'zoomIn', label: 'Zoom In', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideRight', label: 'Slide Right', category: 'Basic', applyTo: ['generic'] },
    { value: 'slideUp', label: 'Slide Up', category: 'Basic', applyTo: ['generic'] },
    { value: 'swing', label: 'Swing (Rotate)', category: 'Loops', applyTo: ['generic'] },
    { value: 'flipX', label: 'Flip X', category: '3D', applyTo: ['generic'] },
    { value: 'flipY', label: 'Flip Y', category: '3D', applyTo: ['generic'] },
    { value: 'unfold', label: 'Unfold (Scale Y)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'expandWidth', label: 'Expand W (Scale X)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'shimmer', label: 'Shimmer', category: 'Loops', applyTo: ['generic'] },
    { value: 'vibrate', label: 'Vibrate', category: 'Loops', applyTo: ['generic'] },
    { value: 'fadeIn', label: 'Fade In', category: 'Entrance', applyTo: ['generic'] },
    { value: 'fadeOut', label: 'Fade Out', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideDown', label: 'Slide Down (Y)', category: 'Basic', applyTo: ['generic'] },
    { value: 'slideLeft', label: 'Slide Left (X)', category: 'Basic', applyTo: ['generic'] },
    { value: 'rotateIn', label: 'Rotate In', category: 'Entrance', applyTo: ['generic'] },
    { value: 'rotateOut', label: 'Rotate Out', category: 'Exit', applyTo: ['generic'] },
    { value: 'skewInfinite', label: 'Skew Infinite', category: 'Loops', applyTo: ['generic'] },
    { value: 'tilt', label: 'Tilt (Rotate X/Y)', category: '3D', applyTo: ['generic'] },
    { value: 'jelly', label: 'Jelly (Elastic Scale)', category: 'Interactive', applyTo: ['generic'] },
    { value: 'blurOut', label: 'Blur Out (Filter)', category: 'Exit', applyTo: ['filter'] },
    { value: 'grayscale', label: 'Grayscale (Filter)', category: 'Filters', applyTo: ['filter'] },
    { value: 'sepia', label: 'Sepia (Filter)', category: 'Filters', applyTo: ['filter'] },
    { value: 'brightnessPulse', label: 'Brightness Pulse', category: 'Loops', applyTo: ['filter'] },
    { value: 'contrastPulse', label: 'Contrast Pulse', category: 'Loops', applyTo: ['filter'] },
    { value: 'dropShadowPulse', label: 'Drop Shadow Pulse', category: 'Loops', applyTo: ['filter'] },
    { value: 'vanish', label: 'Vanish (Scale 0)', category: 'Exit', applyTo: ['generic'] },
    { value: 'expandHeight', label: 'Expand H (Scale Y)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'wave', label: 'Wave (Translate Y)', category: 'Loops', applyTo: ['generic'] },
    { value: 'skewShake', label: 'Skew Shake', category: 'Loops', applyTo: ['generic'] },
    { value: 'rainbowFill', label: 'Rainbow Fill', category: 'Colors', applyTo: ['generic'] },
    { value: 'rainbowStroke', label: 'Rainbow Stroke', category: 'Colors', applyTo: ['generic'] },
    { value: 'blurPulse', label: 'Blur Pulse', category: 'Loops', applyTo: ['filter'] },
    { value: 'scalePulse', label: 'Scale Pulse', category: 'Loops', applyTo: ['generic'] },
    { value: 'rotatePulse', label: 'Rotate Pulse', category: 'Loops', applyTo: ['generic'] },
    { value: 'swingHorizontal', label: 'Swing Horizontal', category: 'Loops', applyTo: ['generic'] },
    { value: 'swingVertical', label: 'Swing Vertical', category: 'Loops', applyTo: ['generic'] },
    { value: 'slideInTop', label: 'Slide In Top', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInBottom', label: 'Slide In Bottom', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideOutTop', label: 'Slide Out Top', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutBottom', label: 'Slide Out Bottom', category: 'Exit', applyTo: ['generic'] },
    { value: 'bounceIn', label: 'Bounce In', category: 'Entrance', applyTo: ['generic'] },
    { value: 'bounceOut', label: 'Bounce Out', category: 'Exit', applyTo: ['generic'] },
    { value: 'tada', label: 'Tada!', category: 'Interactive', applyTo: ['generic'] },
    { value: 'pumping', label: 'Pumping', category: 'Loops', applyTo: ['generic'] },
    { value: 'floatingX', label: 'Floating X', category: 'Loops', applyTo: ['generic'] },
    { value: 'wiggle', label: 'Wiggle', category: 'Loops', applyTo: ['generic'] },
    { value: 'flashRed', label: 'Flash Red', category: 'Colors', applyTo: ['generic'] },
    { value: 'flashWhite', label: 'Flash White', category: 'Colors', applyTo: ['generic'] },
    { value: 'strobe', label: 'Strobe', category: 'Loops', applyTo: ['generic'] },
    { value: 'blink', label: 'Blink', category: 'Loops', applyTo: ['generic'] },
    { value: 'hueLoop', label: 'Hue Loop', category: 'Filters', applyTo: ['filter'] },
    { value: 'saturatePulse', label: 'Saturate Pulse', category: 'Filters', applyTo: ['filter'] },
    { value: 'brightnessLoop', label: 'Brightness Loop', category: 'Filters', applyTo: ['filter'] },
    { value: 'contrastLoop', label: 'Contrast Loop', category: 'Filters', applyTo: ['filter'] },
    { value: 'expandBoth', label: 'Expand Both (Scale)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'skewXPulse', label: 'Skew X Pulse', category: 'Loops', applyTo: ['generic'] },
    // Phase 5: Entrance (12)
    { value: 'slideInLeftBouncy', label: 'Slide In Left (Bouncy)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInRightBouncy', label: 'Slide In Right (Bouncy)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInTopBouncy', label: 'Slide In Top (Bouncy)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInBottomBouncy', label: 'Slide In Bottom (Bouncy)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInLeftElastic', label: 'Slide In Left (Elastic)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInRightElastic', label: 'Slide In Right (Elastic)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInTopElastic', label: 'Slide In Top (Elastic)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'slideInBottomElastic', label: 'Slide In Bottom (Elastic)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'zoomInBouncy', label: 'Zoom In (Bouncy)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'zoomInElastic', label: 'Zoom In (Elastic)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'popInElastic', label: 'Pop In (Elastic)', category: 'Entrance', applyTo: ['generic'] },
    { value: 'rollIn', label: 'Roll In', category: 'Entrance', applyTo: ['generic'] },
    // Phase 5: Exit (12)
    { value: 'slideOutLeftBouncy', label: 'Slide Out Left (Bouncy)', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutRightBouncy', label: 'Slide Out Right (Bouncy)', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutTopBouncy', label: 'Slide Out Top (Bouncy)', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutBottomBouncy', label: 'Slide Out Bottom (Bouncy)', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutLeftElastic', label: 'Slide Out Left (Elastic)', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutRightElastic', label: 'Slide Out Right (Elastic)', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutTopElastic', label: 'Slide Out Top (Elastic)', category: 'Exit', applyTo: ['generic'] },
    { value: 'slideOutBottomElastic', label: 'Slide Out Bottom (Elastic)', category: 'Exit', applyTo: ['generic'] },
    { value: 'zoomOutBouncy', label: 'Zoom Out (Bouncy)', category: 'Exit', applyTo: ['generic'] },
    { value: 'zoomOutElastic', label: 'Zoom Out (Elastic)', category: 'Exit', applyTo: ['generic'] },
    { value: 'popOutElastic', label: 'Pop Out (Elastic)', category: 'Exit', applyTo: ['generic'] },
    { value: 'rollOut', label: 'Roll Out', category: 'Exit', applyTo: ['generic'] },
    // Phase 5: Loops & Bounces (16)
    { value: 'bounceHeavy', label: 'Bounce (Heavy)', category: 'Loops', applyTo: ['generic'] },
    { value: 'bounceLight', label: 'Bounce (Light)', category: 'Loops', applyTo: ['generic'] },
    { value: 'vibrateHeavy', label: 'Vibrate (Heavy)', category: 'Loops', applyTo: ['generic'] },
    { value: 'vibrateLight', label: 'Vibrate (Light)', category: 'Loops', applyTo: ['generic'] },
    { value: 'floatDrift', label: 'Floating (Drift)', category: 'Loops', applyTo: ['generic'] },
    { value: 'floatFigure8', label: 'Floating (Figure 8)', category: 'Loops', applyTo: ['generic'] },
    { value: 'pulseSlow', label: 'Pulse (Slow)', category: 'Loops', applyTo: ['generic'] },
    { value: 'pulseFast', label: 'Pulse (Fast)', category: 'Loops', applyTo: ['generic'] },
    { value: 'heartbeatDouble', label: 'Heartbeat (Double)', category: 'Loops', applyTo: ['generic'] },
    { value: 'ringingBell', label: 'Ringing Bell', category: 'Loops', applyTo: ['generic'] },
    { value: 'pendulum', label: 'Pendulum', category: 'Loops', applyTo: ['generic'] },
    { value: 'swingTop', label: 'Swing Top', category: 'Loops', applyTo: ['generic'] },
    { value: 'wobbleHard', label: 'Wobble (Hard)', category: 'Loops', applyTo: ['generic'] },
    { value: 'jelloX', label: 'Jello X', category: 'Loops', applyTo: ['generic'] },
    { value: 'jelloY', label: 'Jello Y', category: 'Loops', applyTo: ['generic'] },
    { value: 'ping', label: 'Ping', category: 'Loops', applyTo: ['generic'] },
    // Phase 5: 3D-Like (16)
    { value: 'flipInX', label: '3D Flip In X', category: '3D', applyTo: ['generic'] },
    { value: 'flipInY', label: '3D Flip In Y', category: '3D', applyTo: ['generic'] },
    { value: 'flipOutX', label: '3D Flip Out X', category: '3D', applyTo: ['generic'] },
    { value: 'flipOutY', label: '3D Flip Out Y', category: '3D', applyTo: ['generic'] },
    { value: 'flip3D', label: '3D Flip Infinite', category: '3D', applyTo: ['generic'] },
    { value: 'spinX', label: '3D Spin X', category: '3D', applyTo: ['generic'] },
    { value: 'spinY', label: '3D Spin Y', category: '3D', applyTo: ['generic'] },
    { value: 'spinZ', label: '3D Spin Z (CW)', category: '3D', applyTo: ['generic'] },
    { value: 'spinZCCW', label: '3D Spin Z (CCW)', category: '3D', applyTo: ['generic'] },
    { value: 'tiltUp', label: '3D Tilt Up', category: '3D', applyTo: ['generic'] },
    { value: 'tiltDown', label: '3D Tilt Down', category: '3D', applyTo: ['generic'] },
    { value: 'tiltLeft', label: '3D Tilt Left', category: '3D', applyTo: ['generic'] },
    { value: 'tiltRight', label: '3D Tilt Right', category: '3D', applyTo: ['generic'] },
    { value: 'doorOpen', label: '3D Door Open', category: '3D', applyTo: ['generic'] },
    { value: 'doorClose', label: '3D Door Close', category: '3D', applyTo: ['generic'] },
    { value: 'perspectiveRotateX', label: '3D Persp Rotate X', category: '3D', applyTo: ['generic'] },
    { value: 'perspectiveRotateY', label: '3D Persp Rotate Y', category: '3D', applyTo: ['generic'] },
    // Phase 5: Filter Cycles & FX (16)
    { value: 'invertLoop', label: 'Filter Invert Cycle', category: 'Filters', applyTo: ['filter'] },
    { value: 'grayscaleLoop', label: 'Filter Gray Cycle', category: 'Filters', applyTo: ['filter'] },
    { value: 'sepiaLoop', label: 'Filter Sepia Cycle', category: 'Filters', applyTo: ['filter'] },
    { value: 'hueLoopFast', label: 'Filter Hue Fast', category: 'Filters', applyTo: ['filter'] },
    { value: 'blurSubtlePulse', label: 'Filter Blur Subtle', category: 'Filters', applyTo: ['filter'] },
    { value: 'blurHeavyPulse', label: 'Filter Blur Heavy', category: 'Filters', applyTo: ['filter'] },
    { value: 'focusAuto', label: 'Filter Focus Auto', category: 'Filters', applyTo: ['filter'] },
    { value: 'defocusAuto', label: 'Filter Defocus Auto', category: 'Filters', applyTo: ['filter'] },
    { value: 'shadowDistanceLoop', label: 'Filter Shadow Dist', category: 'Filters', applyTo: ['filter'] },
    { value: 'shadowAngleLoop', label: 'Filter Shadow Angle', category: 'Filters', applyTo: ['filter'] },
    { value: 'shadowColorCycle', label: 'Filter Shadow Color', category: 'Filters', applyTo: ['filter'] },
    { value: 'noiseStatic', label: 'Noise Static', category: 'Filters', applyTo: ['filter'] },
    { value: 'glitchExtreme', label: 'Glitch Extreme', category: 'Filters', applyTo: ['filter'] },
    { value: 'glitchSoft', label: 'Glitch Soft', category: 'Filters', applyTo: ['filter'] },
    { value: 'flareBrightness', label: 'Flare Brightness', category: 'Filters', applyTo: ['filter'] },
    { value: 'contrastBurn', label: 'Contrast Burn', category: 'Filters', applyTo: ['filter'] },
    // Phase 5: Colors & Styles (12)
    { value: 'rainbowFillSlow', label: 'Rainbow Fill (Slow)', category: 'Colors', applyTo: ['generic'] },
    { value: 'rainbowStrokeSlow', label: 'Rainbow Stroke (Slow)', category: 'Colors', applyTo: ['generic'] },
    { value: 'fillFadePulse', label: 'Fill Fade Pulse', category: 'Colors', applyTo: ['generic'] },
    { value: 'strokeFadePulse', label: 'Stroke Fade Pulse', category: 'Colors', applyTo: ['generic'] },
    { value: 'neonPulseRed', label: 'Neon Pulse Red', category: 'Colors', applyTo: ['generic'] },
    { value: 'neonPulseBlue', label: 'Neon Pulse Blue', category: 'Colors', applyTo: ['generic'] },
    { value: 'neonPulseGreen', label: 'Neon Pulse Green', category: 'Colors', applyTo: ['generic'] },
    { value: 'neonPulseGold', label: 'Neon Pulse Gold', category: 'Colors', applyTo: ['generic'] },
    { value: 'dashArrayCycle', label: 'Dash Array Cycle', category: 'Colors', applyTo: ['generic'] },
    { value: 'strokeWidthLoop', label: 'Stroke Width Loop', category: 'Colors', applyTo: ['generic'] },
    { value: 'drawInSlow', label: 'Draw In (Slow)', category: 'Paths', applyTo: ['path'] },
    { value: 'drawOutSlow', label: 'Draw Out (Slow)', category: 'Paths', applyTo: ['path'] },
    // Phase 5: Interactive/UX (12)
    { value: 'errorShake', label: 'UX Error Shake', category: 'Interactive', applyTo: ['generic'] },
    { value: 'successPop', label: 'UX Success Pop', category: 'Interactive', applyTo: ['generic'] },
    { value: 'loadingSpinSubtle', label: 'UX Loading Spin', category: 'Interactive', applyTo: ['generic'] },
    { value: 'activeStatePulse', label: 'UX Active Pulse', category: 'Interactive', applyTo: ['generic'] },
    { value: 'hoverLift', label: 'UX Hover Lift', category: 'Interactive', applyTo: ['generic'] },
    { value: 'hoverSink', label: 'UX Hover Sink', category: 'Interactive', applyTo: ['generic'] },
    { value: 'hoverExpand', label: 'UX Hover Expand', category: 'Interactive', applyTo: ['generic'] },
    { value: 'hoverContract', label: 'UX Hover Contract', category: 'Interactive', applyTo: ['generic'] },
    { value: 'focusOutlinePulse', label: 'UX Focus Pulse', category: 'Interactive', applyTo: ['generic'] },
    { value: 'disabledStateGray', label: 'UX Disabled Gray', category: 'Interactive', applyTo: ['generic'] },
    { value: 'urgentBlink', label: 'UX Urgent Blink', category: 'Interactive', applyTo: ['generic'] },
    { value: 'notifyTip', label: 'UX Notify Tip', category: 'Interactive', applyTo: ['generic'] },
    // Phase 7: Liquid & Morph (20)
    { value: 'blobPulse', label: 'Liquid Blob Pulse', category: 'Liquid', applyTo: ['generic'] },
    { value: 'liquidDrip', label: 'Liquid Drip', category: 'Liquid', applyTo: ['generic'] },
    { value: 'waveShiftX', label: 'Liquid Wave X', category: 'Liquid', applyTo: ['generic'] },
    { value: 'waveShiftY', label: 'Liquid Wave Y', category: 'Liquid', applyTo: ['generic'] },
    { value: 'morphElastic', label: 'Liquid Morph Elastic', category: 'Liquid', applyTo: ['path'] },
    { value: 'jellyWobbleX', label: 'Liquid Jelly X', category: 'Liquid', applyTo: ['generic'] },
    { value: 'jellyWobbleY', label: 'Liquid Jelly Y', category: 'Liquid', applyTo: ['generic'] },
    { value: 'organicBreath', label: 'Liquid Organic Breath', category: 'Liquid', applyTo: ['generic'] },
    { value: 'liquidSway', label: 'Liquid Sway', category: 'Liquid', applyTo: ['generic'] },
    { value: 'meltDown', label: 'Liquid Melt Down', category: 'Liquid', applyTo: ['generic'] },
    { value: 'evaporateUp', label: 'Liquid Evaporate Up', category: 'Liquid', applyTo: ['generic'] },
    { value: 'plasmaFlow', label: 'Liquid Plasma Flow', category: 'Liquid', applyTo: ['generic'] },
    { value: 'amoebaStretch', label: 'Liquid Amoeba Stretch', category: 'Liquid', applyTo: ['generic'] },
    { value: 'softBounceX', label: 'Liquid Soft Bounce X', category: 'Liquid', applyTo: ['generic'] },
    { value: 'softBounceY', label: 'Liquid Soft Bounce Y', category: 'Liquid', applyTo: ['generic'] },
    { value: 'viscousDrag', label: 'Liquid Viscous Drag', category: 'Liquid', applyTo: ['generic'] },
    { value: 'morphTilt', label: 'Liquid Morph Tilt', category: 'Liquid', applyTo: ['generic'] },
    { value: 'bubblePop', label: 'Liquid Bubble Pop', category: 'Liquid', applyTo: ['generic'] },
    { value: 'ripplingScale', label: 'Liquid Rippling Scale', category: 'Liquid', applyTo: ['generic'] },
    { value: 'surfaceTension', label: 'Liquid Surface Tension', category: 'Liquid', applyTo: ['generic'] },
    // Phase 7: Advanced Typography (20)
    { value: 'charSpacingExpand', label: 'Type Spacing Expand', category: 'Typography', applyTo: ['text'] },
    { value: 'charSpacingContract', label: 'Type Spacing Contract', category: 'Typography', applyTo: ['text'] },
    { value: 'fontWeightThin', label: 'Type Weight Thin', category: 'Typography', applyTo: ['text'] },
    { value: 'fontWeightBold', label: 'Type Weight Bold', category: 'Typography', applyTo: ['text'] },
    { value: 'textSkewStretch', label: 'Type Skew Stretch', category: 'Typography', applyTo: ['text'] },
    { value: 'textLetterJump', label: 'Type Letter Jump', category: 'Typography', applyTo: ['text'] },
    { value: 'textLineHeightPulse', label: 'Type Line Height', category: 'Typography', applyTo: ['text'] },
    { value: 'textWordPop', label: 'Type Word Pop', category: 'Typography', applyTo: ['text'] },
    { value: 'textTypewriterFade', label: 'Type Typewriter Fade', category: 'Typography', applyTo: ['text'] },
    { value: 'textGhostScroll', label: 'Type Ghost Scroll', category: 'Typography', applyTo: ['text'] },
    { value: 'textRainbowChar', label: 'Type Rainbow Char', category: 'Typography', applyTo: ['text'] },
    { value: 'textBlurFocus', label: 'Type Blur Focus', category: 'Typography', applyTo: ['text'] },
    { value: 'textShadowPulse', label: 'Type Shadow Pulse', category: 'Typography', applyTo: ['text'] },
    { value: 'textOutlineDraw', label: 'Type Outline Draw', category: 'Typography', applyTo: ['text'] },
    { value: 'textWaveform', label: 'Type Waveform Y', category: 'Typography', applyTo: ['text'] },
    { value: 'textJitter', label: 'Type Jitter', category: 'Typography', applyTo: ['text'] },
    { value: 'textPerspectiveRotate', label: 'Type Persp Rotate', category: 'Typography', applyTo: ['text'] },
    { value: 'text3DSpinZ', label: 'Type 3D Spin Z', category: 'Typography', applyTo: ['text'] },
    { value: 'textFloatWave', label: 'Type Float Wave', category: 'Typography', applyTo: ['text'] },
    { value: 'textExpandReveal', label: 'Type Expand Reveal', category: 'Typography', applyTo: ['text'] },
    // Phase 7: Atmospheric & Natural (First 8)
    { value: 'windSwayLeft', label: 'Natural Wind Left', category: 'Natural', applyTo: ['generic'] },
    { value: 'windSwayRight', label: 'Natural Wind Right', category: 'Natural', applyTo: ['generic'] },
    { value: 'flameFlickerSubtle', label: 'Natural Flame Subtle', category: 'Natural', applyTo: ['generic'] },
    { value: 'flameFlickerExtreme', label: 'Natural Flame Extreme', category: 'Natural', applyTo: ['generic'] },
    { value: 'rainDropSingle', label: 'Natural Rain Drop', category: 'Natural', applyTo: ['generic'] },
    { value: 'leafFallSpiral', label: 'Natural Leaf Fall', category: 'Natural', applyTo: ['generic'] },
    { value: 'floatingDustFast', label: 'Natural Dust Fast', category: 'Natural', applyTo: ['generic'] },
    { value: 'floatingDustSlow', label: 'Natural Dust Slow', category: 'Natural', applyTo: ['generic'] },
    { value: 'cloudDrift', label: 'Natural Cloud Drift', category: 'Natural', applyTo: ['generic'] },
    { value: 'starTwinkle', label: 'Natural Star Twinkle', category: 'Natural', applyTo: ['generic'] },
    { value: 'auroraWave', label: 'Natural Aurora Wave', category: 'Natural', applyTo: ['generic'] },
    { value: 'smokeDrift', label: 'Natural Smoke Drift', category: 'Natural', applyTo: ['generic'] },
    { value: 'waterRipple', label: 'Natural Water Ripple', category: 'Natural', applyTo: ['generic'] },
    { value: 'sunlightGlow', label: 'Natural Sunlight Glow', category: 'Natural', applyTo: ['generic'] },
    { value: 'moonlightFade', label: 'Natural Moonlight Fade', category: 'Natural', applyTo: ['generic'] },
    { value: 'crackleStatic', label: 'Natural Crackle Static', category: 'Natural', applyTo: ['generic'] },
    { value: 'thunderFlash', label: 'Natural Thunder Flash', category: 'Natural', applyTo: ['generic'] },
    { value: 'mistSway', label: 'Natural Mist Sway', category: 'Natural', applyTo: ['generic'] },
    { value: 'snowFlakeTumble', label: 'Natural Snow Tumble', category: 'Natural', applyTo: ['generic'] },
    { value: 'grassWaver', label: 'Natural Grass Waver', category: 'Natural', applyTo: ['generic'] },
    // Phase 7: Pattern & Gradient FX (20)
    { value: 'patternSlideX', label: 'Pat Slide X', category: 'Specific', applyTo: ['pattern'] },
    { value: 'patternSlideY', label: 'Pat Slide Y', category: 'Specific', applyTo: ['pattern'] },
    { value: 'patternZoom', label: 'Pat Zoom', category: 'Specific', applyTo: ['pattern'] },
    { value: 'patternRotateInfinite', label: 'Pat Rotate Inf', category: 'Specific', applyTo: ['pattern'] },
    { value: 'gradientShiftHorizontal', label: 'Grad Shift H', category: 'Specific', applyTo: ['gradient'] },
    { value: 'gradientShiftVertical', label: 'Grad Shift V', category: 'Specific', applyTo: ['gradient'] },
    { value: 'gradientRotate360', label: 'Grad Rotate 360', category: 'Specific', applyTo: ['gradient'] },
    { value: 'gradientStopColorBlink', label: 'Grad Color Blink', category: 'Specific', applyTo: ['gradient'] },
    { value: 'gradientStopOffsetPulse', label: 'Grad Offset Pulse', category: 'Specific', applyTo: ['gradient'] },
    { value: 'shimmerOverlay', label: 'Grad Shimmer Overlay', category: 'Specific', applyTo: ['generic'] },
    { value: 'patternFlowVertical', label: 'Pat Flow V', category: 'Specific', applyTo: ['pattern'] },
    { value: 'patternFlowHorizontal', label: 'Pat Flow H', category: 'Specific', applyTo: ['pattern'] },
    { value: 'gradientVignettePulse', label: 'Grad Vignette Pulse', category: 'Specific', applyTo: ['gradient'] },
    { value: 'gradientGlowCenter', label: 'Grad Glow Center', category: 'Specific', applyTo: ['gradient'] },
    { value: 'patternSkewCycle', label: 'Pat Skew Cycle', category: 'Specific', applyTo: ['pattern'] },
    { value: 'patternDistort', label: 'Pat Distort', category: 'Specific', applyTo: ['pattern'] },
    { value: 'gradientContrastCycle', label: 'Grad Contrast Cycle', category: 'Specific', applyTo: ['gradient'] },
    { value: 'gradientSaturationCycle', label: 'Grad Saturation Cycle', category: 'Specific', applyTo: ['gradient'] },
    { value: 'patternOpacityPulse', label: 'Pat Opacity Pulse', category: 'Specific', applyTo: ['pattern'] },
    { value: 'gradientAngleSweep', label: 'Grad Angle Sweep', category: 'Specific', applyTo: ['gradient'] },
    // Phase 7: Advanced UI/UX (20)
    { value: 'dragHintHorizontal', label: 'UX Drag Hint H', category: 'Interactive', applyTo: ['generic'] },
    { value: 'dragHintVertical', label: 'UX Drag Hint V', category: 'Interactive', applyTo: ['generic'] },
    { value: 'dropIndicatorPulse', label: 'UX Drop Indicator', category: 'Interactive', applyTo: ['generic'] },
    { value: 'scanLineDown', label: 'UX Scan Line Down', category: 'Interactive', applyTo: ['generic'] },
    { value: 'scanLineUp', label: 'UX Scan Line Up', category: 'Interactive', applyTo: ['generic'] },
    { value: 'focusGlowPulse', label: 'UX Focus Glow Pulse', category: 'Interactive', applyTo: ['generic'] },
    { value: 'notifyShakeHard', label: 'UX Notify Shake Hard', category: 'Interactive', applyTo: ['generic'] },
    { value: 'notifyShakeSoft', label: 'UX Notify Shake Soft', category: 'Interactive', applyTo: ['generic'] },
    { value: 'errorBlinkRed', label: 'UX Error Blink Red', category: 'Interactive', applyTo: ['generic'] },
    { value: 'successBlinkGreen', label: 'UX Success Blink Green', category: 'Interactive', applyTo: ['generic'] },
    { value: 'savingSpinner', label: 'UX Saving Spinner', category: 'Interactive', applyTo: ['generic'] },
    { value: 'uploadPulse', label: 'UX Upload Pulse', category: 'Interactive', applyTo: ['generic'] },
    { value: 'downloadArrowFlow', label: 'UX Download Arrow', category: 'Interactive', applyTo: ['generic'] },
    { value: 'searchPulse', label: 'UX Search Pulse', category: 'Interactive', applyTo: ['generic'] },
    { value: 'buttonPressScale', label: 'UX Button Press', category: 'Interactive', applyTo: ['generic'] },
    { value: 'buttonReleaseSpring', label: 'UX Button Release', category: 'Interactive', applyTo: ['generic'] },
    { value: 'toggleSwitchGlide', label: 'UX Toggle Glide', category: 'Interactive', applyTo: ['generic'] },
    { value: 'tooltipPop', label: 'UX Tooltip Pop', category: 'Interactive', applyTo: ['generic'] },
    { value: 'contextMenuReveal', label: 'UX Context Reveal', category: 'Interactive', applyTo: ['generic'] },
    { value: 'selectionGlow', label: 'UX Selection Glow', category: 'Interactive', applyTo: ['generic'] },
    // Phase 8: Geometric & Mathematical (20)
    { value: 'spiralGrowth', label: 'Geo Spiral Growth', category: 'Geometric', applyTo: ['path'] },
    { value: 'sineWavePath', label: 'Geo Sine Wave', category: 'Geometric', applyTo: ['path'] },
    { value: 'fractalZoom', label: 'Geo Fractal Zoom', category: 'Geometric', applyTo: ['generic'] },
    { value: 'geometricPulse', label: 'Geo Pulse', category: 'Geometric', applyTo: ['generic'] },
    { value: 'squareRotateSubtle', label: 'Geo Square Rotate', category: 'Geometric', applyTo: ['generic'] },
    { value: 'circleOrbit', label: 'Geo Circle Orbit', category: 'Geometric', applyTo: ['generic'] },
    { value: 'starExpand', label: 'Geo Star Expand', category: 'Geometric', applyTo: ['generic'] },
    { value: 'polygonShift', label: 'Geo Polygon Shift', category: 'Geometric', applyTo: ['path'] },
    { value: 'gridExpand', label: 'Geo Grid Expand', category: 'Geometric', applyTo: ['generic'] },
    { value: 'dotMatrixPulse', label: 'Geo Dot Matrix', category: 'Geometric', applyTo: ['generic'] },
    { value: 'lissajousMotion', label: 'Geo Lissajous', category: 'Geometric', applyTo: ['generic'] },
    { value: 'fibonacciSpiral', label: 'Geo Fibonacci', category: 'Geometric', applyTo: ['path'] },
    { value: 'tessellationFade', label: 'Geo Tessellation', category: 'Geometric', applyTo: ['generic'] },
    { value: 'kaleidoscopeSpin', label: 'Geo Kaleidoscope', category: 'Geometric', applyTo: ['generic'] },
    { value: 'vectorDrift', label: 'Geo Vector Drift', category: 'Geometric', applyTo: ['generic'] },
    { value: 'radialBurst', label: 'Geo Radial Burst', category: 'Geometric', applyTo: ['generic'] },
    { value: 'concentricPulse', label: 'Geo Concentric', category: 'Geometric', applyTo: ['generic'] },
    { value: 'hypocycloidDraw', label: 'Geo Hypocycloid', category: 'Geometric', applyTo: ['path'] },
    { value: 'epiCycleMove', label: 'Geo Epicycle', category: 'Geometric', applyTo: ['generic'] },
    { value: 'goldenRatioScale', label: 'Geo Golden Ratio', category: 'Geometric', applyTo: ['generic'] },
    // Phase 8: Retro & Synthwave (40)
    { value: 'vhsGlitch', label: 'Retro VHS Glitch', category: 'Retro', applyTo: ['generic'] },
    { value: 'neonFlickerFast', label: 'Retro Neon Fast', category: 'Retro', applyTo: ['generic'] },
    { value: 'neonFlickerSlow', label: 'Retro Neon Slow', category: 'Retro', applyTo: ['generic'] },
    { value: 'gridShiftZ', label: 'Retro Grid Z', category: 'Retro', applyTo: ['generic'] },
    { value: 'scanlineInterference', label: 'Retro Scanline', category: 'Retro', applyTo: ['generic'] },
    { value: 'crtDistortion', label: 'Retro CRT Distort', category: 'Retro', applyTo: ['generic'] },
    { value: 'retroCyberSpin', label: 'Retro Cyber Spin', category: 'Retro', applyTo: ['generic'] },
    { value: 'synthwavePulse', label: 'Retro Synth Pulse', category: 'Retro', applyTo: ['generic'] },
    { value: 'arcadeFlash', label: 'Retro Arcade Flash', category: 'Retro', applyTo: ['generic'] },
    { value: 'pixelateIn', label: 'Retro Pixelate In', category: 'Retro', applyTo: ['generic'] },
    { value: 'retroWaveScroll', label: 'Retro Wave Scroll', category: 'Retro', applyTo: ['generic'] },
    { value: 'cyanMagentaSplit', label: 'Retro CMY Split', category: 'Retro', applyTo: ['generic'] },
    { value: 'eightBitJump', label: 'Retro 8-bit Jump', category: 'Retro', applyTo: ['generic'] },
    { value: 'glitchBars', label: 'Retro Glitch Bars', category: 'Retro', applyTo: ['generic'] },
    { value: 'staticNoiseOverlay', label: 'Retro Static Noise', category: 'Retro', applyTo: ['generic'] },
    { value: 'retroZoom', label: 'Retro Zoom', category: 'Retro', applyTo: ['generic'] },
    { value: 'gridWarp', label: 'Retro Grid Warp', category: 'Retro', applyTo: ['generic'] },
    { value: 'pixelDrift', label: 'Retro Pixel Drift', category: 'Retro', applyTo: ['generic'] },
    { value: 'eightBitFade', label: 'Retro 8-bit Fade', category: 'Retro', applyTo: ['generic'] },
    { value: 'retroShadowExtrude', label: 'Retro Shadow Ext', category: 'Retro', applyTo: ['generic'] },
    { value: 'vhsColorBleed', label: 'Retro VHS Bleed', category: 'Retro', applyTo: ['generic'] },
    { value: 'scanlineRoll', label: 'Retro Scanline Roll', category: 'Retro', applyTo: ['generic'] },
    { value: 'crtScanlines', label: 'Retro CRT Lines', category: 'Retro', applyTo: ['generic'] },
    { value: 'retroGlowPulse', label: 'Retro Glow Pulse', category: 'Retro', applyTo: ['generic'] },
    { value: 'analogDistortion', label: 'Retro Analog Dist', category: 'Retro', applyTo: ['generic'] },
    { value: 'cyberDrift', label: 'Retro Cyber Drift', category: 'Retro', applyTo: ['generic'] },
    { value: 'synthShift', label: 'Retro Synth Shift', category: 'Retro', applyTo: ['generic'] },
    { value: 'arcadePop', label: 'Retro Arcade Pop', category: 'Retro', applyTo: ['generic'] },
    { value: 'neonPathDraw', label: 'Retro Neon Path', category: 'Retro', applyTo: ['path'] },
    { value: 'retroTilt', label: 'Retro Tilt', category: 'Retro', applyTo: ['generic'] },
    { value: 'vintageSepiaFlicker', label: 'Retro Sepia Flick', category: 'Retro', applyTo: ['generic'] },
    { value: 'oldFilmShake', label: 'Retro Film Shake', category: 'Retro', applyTo: ['generic'] },
    { value: 'pixelStretch', label: 'Retro Pixel Stretch', category: 'Retro', applyTo: ['generic'] },
    { value: 'retroBounce', label: 'Retro Bounce', category: 'Retro', applyTo: ['generic'] },
    { value: 'eightBitSpin', label: 'Retro 8-bit Spin', category: 'Retro', applyTo: ['generic'] },
    { value: 'vhsPauseLine', label: 'Retro VHS Pause', category: 'Retro', applyTo: ['generic'] },
    { value: 'gridRotate', label: 'Retro Grid Rotate', category: 'Retro', applyTo: ['generic'] },
    { value: 'neonFlickerExtreme', label: 'Retro Neon Extrem', category: 'Retro', applyTo: ['generic'] },
    { value: 'retroWaveFloat', label: 'Retro Wave Float', category: 'Retro', applyTo: ['generic'] },
    { value: 'cyberPulse', label: 'Retro Cyber Pulse', category: 'Retro', applyTo: ['generic'] },
    // Phase 8: Cinematic & Dramatic (40)
    { value: 'lensFlareDrive', label: 'Cine Lens Flare', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'moodyFadeIn', label: 'Cine Moody In', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'moodyFadeOut', label: 'Cine Moody Out', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'letterboxSlideIn', label: 'Cine Box In', category: 'Cinematic', applyTo: ['root'] },
    { value: 'letterboxSlideOut', label: 'Cine Box Out', category: 'Cinematic', applyTo: ['root'] },
    { value: 'filmGrainOverlay', label: 'Cine Film Grain', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'panoramicSlow', label: 'Cine Panoramic', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'dramaticZoom', label: 'Cine Dram Zoom', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cinematicSoftFocus', label: 'Cine Soft Focus', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'anamorphicStretch', label: 'Cine Anamorphic', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'slowMoReveal', label: 'Cine Slow-Mo', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cameraShakeHeavy', label: 'Cine Shake Heavy', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cameraShakeLight', label: 'Cine Shake Light', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'shutterBlink', label: 'Cine Shutter', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'vignettePulse', label: 'Cine Vignette Pulse', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cinematicTiltShift', label: 'Cine Tilt Shift', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'filmIntroRoll', label: 'Cine Film Intro', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'creditScrollUp', label: 'Cine Credits Up', category: 'Cinematic', applyTo: ['text'] },
    { value: 'focusPull', label: 'Cine Focus Pull', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'dramaticColorShift', label: 'Cine Color Shift', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cinematicFadeBlack', label: 'Cine Fade Black', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cinematicFadeWhite', label: 'Cine Fade White', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'hollywoodZoom', label: 'Cine Hollywood Z', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'depthOfFieldBlur', label: 'Cine Depth Blur', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'dramaticPush', label: 'Cine Dram Push', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cinematicPanLeft', label: 'Cine Pan Left', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cinematicPanRight', label: 'Cine Pan Right', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'noirContrast', label: 'Cine Noir Contr', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'sepiaDrama', label: 'Cine Sepia Drama', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'overexposedFlash', label: 'Cine Overexpose', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'blueHourFade', label: 'Cine Blue Hour', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'goldenHourGlow', label: 'Cine Golden Glow', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'dramaticShadowLong', label: 'Cine Long Shadow', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'cinematicLetterboxPulse', label: 'Cine Box Pulse', category: 'Cinematic', applyTo: ['root'] },
    { value: 'motionBlurDrift', label: 'Cine Motion Blur', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'slowRevealDraw', label: 'Cine Slow Draw', category: 'Cinematic', applyTo: ['path'] },
    { value: 'cinematicIntroScale', label: 'Cine Intro Scale', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'dramaticEntrance', label: 'Cine Dram Entr', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'epicScaleUp', label: 'Cine Epic Scale', category: 'Cinematic', applyTo: ['generic'] },
    { value: 'heroicRotate', label: 'Cine Hero Rotate', category: 'Cinematic', applyTo: ['generic'] },
    // Phase 8: Artistic & Sketchy (40)
    { value: 'pencilWobble', label: 'Art Pencil Wobble', category: 'Artistic', applyTo: ['generic'] },
    { value: 'watercolorBleed', label: 'Art Watercolor', category: 'Artistic', applyTo: ['generic'] },
    { value: 'inkSplatPop', label: 'Art Ink Splat', category: 'Artistic', applyTo: ['generic'] },
    { value: 'brushStrokeDraw', label: 'Art Brush Draw', category: 'Artistic', applyTo: ['path'] },
    { value: 'textureJive', label: 'Art Texture Jive', category: 'Artistic', applyTo: ['generic'] },
    { value: 'charcoalDrift', label: 'Art Charcoal', category: 'Artistic', applyTo: ['generic'] },
    { value: 'pastelGlow', label: 'Art Pastel Glow', category: 'Artistic', applyTo: ['generic'] },
    { value: 'markerScribble', label: 'Art Marker Scrib', category: 'Artistic', applyTo: ['generic'] },
    { value: 'stippleFade', label: 'Art Stipple', category: 'Artistic', applyTo: ['generic'] },
    { value: 'crayonRoughEase', label: 'Art Crayon Rough', category: 'Artistic', applyTo: ['generic'] },
    { value: 'artisticRoughEdges', label: 'Art Rough Edge', category: 'Artistic', applyTo: ['generic'] },
    { value: 'inkWashIn', label: 'Art Ink Wash In', category: 'Artistic', applyTo: ['generic'] },
    { value: 'watercolorFadeOut', label: 'Art Water Out', category: 'Artistic', applyTo: ['generic'] },
    { value: 'sketchedLineDraw', label: 'Art Sketch Draw', category: 'Artistic', applyTo: ['path'] },
    { value: 'vibrantSplatter', label: 'Art Vibr Splatter', category: 'Artistic', applyTo: ['generic'] },
    { value: 'canvasTexturePulse', label: 'Art Canvas Pulse', category: 'Artistic', applyTo: ['generic'] },
    { value: 'oilPaintDrift', label: 'Art Oil Paint', category: 'Artistic', applyTo: ['generic'] },
    { value: 'acrylicPop', label: 'Art Acrylic Pop', category: 'Artistic', applyTo: ['generic'] },
    { value: 'sketchyPerspective', label: 'Art Perspective', category: 'Artistic', applyTo: ['generic'] },
    { value: 'artisticRoll', label: 'Art Roll', category: 'Artistic', applyTo: ['generic'] },
    { value: 'inkDripSlow', label: 'Art Ink Drip', category: 'Artistic', applyTo: ['generic'] },
    { value: 'watercolorPulse', label: 'Art Water Pulse', category: 'Artistic', applyTo: ['generic'] },
    { value: 'pencilShade', label: 'Art Pencil Shade', category: 'Artistic', applyTo: ['generic'] },
    { value: 'sketchyBounce', label: 'Art Sketch Bounce', category: 'Artistic', applyTo: ['generic'] },
    { value: 'scribbleExpand', label: 'Art Scribble Exp', category: 'Artistic', applyTo: ['generic'] },
    { value: 'artisticFloat', label: 'Art Float', category: 'Artistic', applyTo: ['generic'] },
    { value: 'inkSpread', label: 'Art Ink Spread', category: 'Artistic', applyTo: ['generic'] },
    { value: 'watercolorWave', label: 'Art Water Wave', category: 'Artistic', applyTo: ['generic'] },
    { value: 'pencilTilt', label: 'Art Pencil Tilt', category: 'Artistic', applyTo: ['generic'] },
    { value: 'sketchySpin', label: 'Art Sketch Spin', category: 'Artistic', applyTo: ['generic'] },
    { value: 'markerStrokeIn', label: 'Art Marker In', category: 'Artistic', applyTo: ['path'] },
    { value: 'stippleSpiral', label: 'Art Stip Spiral', category: 'Artistic', applyTo: ['generic'] },
    { value: 'artisticSkew', label: 'Art Skew', category: 'Artistic', applyTo: ['generic'] },
    { value: 'inkBurst', label: 'Art Ink Burst', category: 'Artistic', applyTo: ['generic'] },
    { value: 'watercolorShimmer', label: 'Art Water Shimmer', category: 'Artistic', applyTo: ['generic'] },
    { value: 'pencilVibrate', label: 'Art Pencil Vibrate', category: 'Artistic', applyTo: ['generic'] },
    { value: 'sketchyDrift', label: 'Art Sketch Drift', category: 'Artistic', applyTo: ['generic'] },
    { value: 'markerWobble', label: 'Art Marker Wobble', category: 'Artistic', applyTo: ['generic'] },
    { value: 'artisticSwing', label: 'Art Swing', category: 'Artistic', applyTo: ['generic'] },
    { value: 'inkReveal', label: 'Art Ink Reveal', category: 'Artistic', applyTo: ['generic'] },
    // Phase 8: Modern Minimalist UI (40)
    { value: 'microSlideIn', label: 'Mini Slide In', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'microSlideOut', label: 'Mini Slide Out', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'smoothOvershoot', label: 'Mini Overshoot', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'subtleGlint', label: 'Mini Glint', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'cleanFocus', label: 'Mini Focus', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'edgeGlowPulse', label: 'Mini Edge Glow', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'minimalistPop', label: 'Mini Pop', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'uiSoftReveal', label: 'Mini Soft Reveal', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'elegantSlide', label: 'Mini Elegant Slide', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'preciseScale', label: 'Mini Precise Scale', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'subtleShadowHover', label: 'Mini Shadow Hover', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'cleanFadeIn', label: 'Mini Fade In', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'minimalistBlink', label: 'Mini Blink', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'uiFloat', label: 'Mini Float', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'smoothContract', label: 'Mini Contract', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'elegantRotate', label: 'Mini Rotate', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'microBounce', label: 'Mini Bounce', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'cleanPerspective', label: 'Mini Perspective', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'uiScanLine', label: 'Mini Scan Line', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'subtleParallax', label: 'Mini Parallax', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'modernGlowIn', label: 'Mini Glow In', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'preciseDrift', label: 'Mini Drift', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'minimalistSkew', label: 'Mini Skew', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'uiSoftElastic', label: 'Mini Elastic', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'cleanReveal', label: 'Mini Reveal', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'elegantTilt', label: 'Mini Tilt', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'microShift', label: 'Mini Shift', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'subtleExpansion', label: 'Mini Expansion', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'modernShadowSweep', label: 'Mini Shadow Sweep', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'uiGlassmorphismPulse', label: 'Mini Glass Pulse', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'cleanContract', label: 'Mini Clean Contr', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'elegantFloat', label: 'Mini Elegant Float', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'microScale', label: 'Mini Scale', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'subtlePulseIn', label: 'Mini Pulse In', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'modernReveal', label: 'Mini Modern Reveal', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'uiPrecisionMove', label: 'Mini Precision', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'cleanRotate', label: 'Mini Clean Rotate', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'elegantExpand', label: 'Mini Expand', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'microBlink', label: 'Mini Micro Blink', category: 'Minimalist', applyTo: ['generic'] },
    { value: 'subtleReveal', label: 'Mini Subtle Rev', category: 'Minimalist', applyTo: ['generic'] },
    // Phase 8: Utility & Debug (20)
    { value: 'highlightCheckRed', label: 'Debug Red Check', category: 'Specific', applyTo: ['generic'] },
    { value: 'highlightCheckGreen', label: 'Debug Green Check', category: 'Specific', applyTo: ['generic'] },
    { value: 'boundaryPulse', label: 'Debug Boundary', category: 'Specific', applyTo: ['generic'] },
    { value: 'anchorSpin', label: 'Debug Anchor Spin', category: 'Specific', applyTo: ['generic'] },
    { value: 'originMarker', label: 'Debug Origin', category: 'Specific', applyTo: ['generic'] },
    { value: 'debugWireframePulse', label: 'Debug Wireframe', category: 'Specific', applyTo: ['generic'] },
    { value: 'layoutGridFlash', label: 'Debug Grid Flash', category: 'Specific', applyTo: ['generic'] },
    { value: 'alignmentAssist', label: 'Debug Alignment', category: 'Specific', applyTo: ['generic'] },
    { value: 'elementTracker', label: 'Debug Tracker', category: 'Specific', applyTo: ['generic'] },
    { value: 'debugBlink', label: 'Debug Blink', category: 'Specific', applyTo: ['generic'] },
    { value: 'rulerMarkDrift', label: 'Debug Ruler', category: 'Specific', applyTo: ['generic'] },
    { value: 'guideLineGlow', label: 'Debug Guide Glow', category: 'Specific', applyTo: ['generic'] },
    { value: 'paddingPulse', label: 'Debug Padding', category: 'Specific', applyTo: ['generic'] },
    { value: 'marginPulse', label: 'Debug Margin', category: 'Specific', applyTo: ['generic'] },
    { value: 'zIndexSwap', label: 'Debug Z-Index', category: 'Specific', applyTo: ['generic'] },
    { value: 'opacityCheck', label: 'Debug Opacity', category: 'Specific', applyTo: ['generic'] },
    { value: 'sizeTracker', label: 'Debug Size', category: 'Specific', applyTo: ['generic'] },
    { value: 'positionTracker', label: 'Debug Position', category: 'Specific', applyTo: ['generic'] },
    { value: 'debugRotation', label: 'Debug Rotation', category: 'Specific', applyTo: ['generic'] },
    { value: 'idTagReveal', label: 'Debug ID Tag', category: 'Specific', applyTo: ['generic'] },
];

export interface PresetConfig {
    type?: 'animate' | 'animateTransform' | 'animateMotion' | 'set';
    attributeName?: string;
    dur?: number;
    from?: string;
    to?: string;
    values?: string;
    useValues?: boolean;
    repeatCount?: string;
    fill?: 'freeze' | 'remove';
    calcMode?: 'linear' | 'discrete' | 'paced' | 'spline';
    transformType?: 'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY';
    path?: string;
    mpath?: string;
    rotate?: 'auto' | 'auto-reverse' | string;
    keyTimes?: string;
    keyPoints?: string;
    keySplines?: string;
    additive?: 'replace' | 'sum';
    accumulate?: 'none' | 'sum';
    targetId?: string;
}

export const getPresetConfig = (preset: AnimationSelectValue): PresetConfig => {
    const base: PresetConfig = {
        dur: 2,
        repeatCount: '1',
        fill: 'freeze',
        calcMode: 'linear',
        additive: 'replace',
        accumulate: 'none',
        useValues: false,
        values: '',
        keyTimes: '',
        keyPoints: '',
        keySplines: '',
    };

    switch (preset) {
        case 'fade':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '1', to: '0' };
        case 'rotate':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', additive: 'sum' };
        case 'move':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '50 0', additive: 'sum' };
        case 'scale':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '1.2 1.2' };
        case 'position':
            return { ...base, type: 'animate', attributeName: 'x', from: '0', to: '40' };
        case 'size':
            return { ...base, type: 'animate', attributeName: 'width', from: '20', to: '60' };
        case 'pathDraw':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0' };
        case 'fillColor':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff6b6b;#4ecdc4;#ff6b6b', useValues: true, repeatCount: 'indefinite' };
        case 'strokeColor':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#111111;#ff9900;#111111', useValues: true, repeatCount: 'indefinite' };
        case 'strokeWidth':
            return { ...base, type: 'animate', attributeName: 'stroke-width', from: '1', to: '4' };
        case 'fontSize':
            return { ...base, type: 'animate', attributeName: 'font-size', from: '16', to: '28' };
        case 'fontWeight':
            return { ...base, type: 'animate', attributeName: 'font-weight', from: '400', to: '700' };
        case 'letterSpacing':
            return { ...base, type: 'animate', attributeName: 'letter-spacing', from: '0', to: '4' };
        case 'circleRadius':
            return { ...base, type: 'animate', attributeName: 'r', from: '10', to: '50' };
        case 'linePoints':
            return { ...base, type: 'animate', attributeName: 'x1', from: '0', to: '100' };
        case 'pathData':
            return { ...base, type: 'animate', attributeName: 'd', from: 'M0 0 L100 0', to: 'M0 0 L100 100' };
        case 'textPosition':
            return { ...base, type: 'animate', attributeName: 'x', from: '0', to: '50' };
        case 'filterBlur':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', from: '0', to: '5' };
        case 'filterOffset':
            return { ...base, type: 'animate', attributeName: 'dx', from: '0', to: '10' };
        case 'filterColorMatrix':
            return { ...base, type: 'animate', attributeName: 'values', from: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', to: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0' };
        case 'filterFlood':
            return { ...base, type: 'animate', attributeName: 'flood-color', from: '#ff0000', to: '#0000ff' };
        case 'patternSize':
            return { ...base, type: 'animate', attributeName: 'width', from: '10', to: '50' };
        case 'patternTransform':
            return { ...base, type: 'animateTransform', attributeName: 'patternTransform', transformType: 'rotate', from: 'rotate(0)', to: 'rotate(360)' };
        case 'gradientStopColor':
            return { ...base, type: 'animate', attributeName: 'stop-color', from: '#ff0000', to: '#0000ff' };
        case 'gradientStopOffset':
            return { ...base, type: 'animate', attributeName: 'offset', from: '0%', to: '100%' };
        case 'gradientPosition':
            return { ...base, type: 'animate', attributeName: 'x1', from: '0%', to: '100%' };
        case 'linearGradient':
            return { ...base, type: 'animate', attributeName: 'x1', from: '0%', to: '100%' };
        case 'radialGradient':
            return { ...base, type: 'animate', attributeName: 'cx', from: '50%', to: '25%' };
        case 'viewBox':
            return { ...base, type: 'animate', attributeName: 'viewBox', targetId: 'svg-root', from: '0 0 100 100', to: '0 0 200 200' };
        case 'set':
            return { ...base, type: 'set', attributeName: 'opacity', to: '0', dur: 0 };
        case 'animateMotion':
            return { ...base, type: 'animateMotion', path: 'M 0 0 L 100 0', rotate: 'auto' };
        case 'animateMotionWithMPath':
            return { ...base, type: 'animateMotion', mpath: 'path-id', rotate: 'auto' };
        case 'heartbeat':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1.2; 1 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1.5 };
        case 'shake':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 10; -10; 10; -10; 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.5, additive: 'sum' };
        case 'slideIn':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-100 0', to: '0 0', dur: 0.8, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.1 0.25 1', additive: 'sum' };
        case 'popIn':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.2 1.2; 1 1', keyTimes: '0; 0.7; 1', useValues: true, dur: 0.6, calcMode: 'spline', keySplines: '0.25 0.1 0.25 1; 0.25 0.1 0.25 1' };
        case 'dashMarch':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '20', to: '0', dur: 1, repeatCount: 'indefinite' };
        case 'blurIn':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', from: '10', to: '0', dur: 1 };
        case 'saturate':
            return { ...base, type: 'animate', attributeName: 'values', from: '0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0', to: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', dur: 2 };
        case 'hueRotate':
            return { ...base, type: 'animate', attributeName: 'values', from: '0', to: '360', dur: 3, repeatCount: 'indefinite' };
        case 'flash':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.2; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.2, repeatCount: 'indefinite' };
        case 'elasticScale':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.4 1.4; 0.8 0.8; 1.1 1.1; 0.95 0.95; 1 1', keyTimes: '0; 0.3; 0.5; 0.7; 0.85; 1', useValues: true, dur: 1.5, calcMode: 'linear' };
        case 'float':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'pulseOpacity':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.3; 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'spinInfinite':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', repeatCount: 'indefinite', dur: 3, additive: 'sum' };
        case 'bounce':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -50; 0 0', keyTimes: '0; 0.5; 1', keySplines: '0.1 0.8 0.4 1; 0.4 0 0.9 0.2', calcMode: 'spline', useValues: true, repeatCount: 'indefinite', dur: 1, additive: 'sum' };
        case 'glitch':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 5 -2; -3 4; 2 -5; 0 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, repeatCount: 'indefinite', dur: 0.3, additive: 'sum' };
        case 'zoomIn':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0 0', to: '1 1', dur: 0.5, calcMode: 'spline', keySplines: '0.34 1.56 0.64 1' };
        case 'slideRight':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-200 0', to: '0 0', dur: 0.6, additive: 'sum' };
        case 'slideUp':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 200', to: '0 0', dur: 0.6, additive: 'sum' };
        case 'swing':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '-15; 15; -15', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'flipX':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; -1 1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 1 };
        case 'flipY':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1 -1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 1 };
        case 'unfold':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 0', to: '1 1', dur: 0.6 };
        case 'expandWidth':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0 1', to: '1 1', dur: 0.6 };
        case 'shimmer':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.5; 1; 0.8; 1', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, repeatCount: 'indefinite', dur: 1 };
        case 'vibrate':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 2; -2; 2; 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, repeatCount: 'indefinite', dur: 0.1, additive: 'sum' };
        case 'fadeIn':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '1' };
        case 'fadeOut':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '1', to: '0' };
        case 'slideDown':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -200', to: '0 0', dur: 0.6, additive: 'sum' };
        case 'slideLeft':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '200 0', to: '0 0', dur: 0.6, additive: 'sum' };
        case 'rotateIn':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '-180', to: '0', dur: 0.8, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.175 0.885 0.32 1.275', additive: 'sum' };
        case 'rotateOut':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '180', dur: 0.8, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.6 -0.28 0.735 0.045', additive: 'sum' };
        case 'skewInfinite':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 20; -20; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, repeatCount: 'indefinite', dur: 3, additive: 'sum' };
        case 'tilt':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 5; -5; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, repeatCount: 'indefinite', dur: 4, additive: 'sum' };
        case 'jelly':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.25 0.75; 0.75 1.25; 1.15 0.85; 0.95 1.05; 1.05 0.95; 1 1', keyTimes: '0; 0.3; 0.4; 0.5; 0.65; 0.75; 1', useValues: true, dur: 0.9 };
        case 'blurOut':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', from: '0', to: '10', dur: 1 };
        case 'grayscale':
            return { ...base, type: 'animate', attributeName: 'values', from: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', to: '0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0', dur: 1.5 };
        case 'sepia':
            return { ...base, type: 'animate', attributeName: 'values', from: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', to: '0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0', dur: 1.5 };
        case 'brightnessPulse':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 1.5 0 0 0 0 0 1.5 0 0 0 0 0 1.5 0 0 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'contrastPulse':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 2 0 0 0 -0.5 0 2 0 0 -0.5 0 2 0 0 -0.5 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'dropShadowPulse':
            return { ...base, type: 'animate', attributeName: 'dx', values: '0; 10; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'vanish':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '0 0', dur: 0.5, fill: 'freeze' };
        case 'expandHeight':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 0', to: '1 1', dur: 0.6 };
        case 'wave':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -10; 0 10; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'skewShake':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 10; -10; 10; 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 0.4, additive: 'sum' };
        case 'rainbowFill':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff0000; #ff7f00; #ffff00; #00ff00; #0000ff; #4b0082; #9400d3; #ff0000', keyTimes: '0; 0.14; 0.28; 0.42; 0.56; 0.7; 0.84; 1', useValues: true, repeatCount: 'indefinite', dur: 5 };
        case 'rainbowStroke':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#ff0000; #ff7f00; #ffff00; #00ff00; #0000ff; #4b0082; #9400d3; #ff0000', keyTimes: '0; 0.14; 0.28; 0.42; 0.56; 0.7; 0.84; 1', useValues: true, repeatCount: 'indefinite', dur: 5 };
        case 'blurPulse':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '0; 5; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'scalePulse':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 1.1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1.2 };
        case 'rotatePulse':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 15; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'swingHorizontal':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -20 0; 20 0; 0 0', keyTimes: '0; 0.25; 0.75; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'swingVertical':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 20; 0 0', keyTimes: '0; 0.25; 0.75; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'slideInTop':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -1000', to: '0 0', dur: 0.8, calcMode: 'spline', keySplines: '0.25 0.46 0.45 0.94', additive: 'sum' };
        case 'slideInBottom':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 1000', to: '0 0', dur: 0.8, calcMode: 'spline', keySplines: '0.25 0.46 0.45 0.94', additive: 'sum' };
        case 'slideOutTop':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 -1000', dur: 0.8, calcMode: 'spline', keySplines: '0.55 0.055 0.675 0.19', additive: 'sum' };
        case 'slideOutBottom':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 1000', dur: 0.8, calcMode: 'spline', keySplines: '0.55 0.055 0.675 0.19', additive: 'sum' };
        case 'bounceIn':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0.3 0.3; 1.1 1.1; 0.9 0.9; 1 1', keyTimes: '0; 0.2; 0.4; 0.6', useValues: true, dur: 0.75 };
        case 'bounceOut':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0.9 0.9; 1.1 1.1; 0.3 0.3', useValues: true, fill: 'freeze', dur: 0.75 };
        case 'tada':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0.9 0.9; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1 1', keyTimes: '0; 0.1; 0.2; 0.3; 0.4; 0.5; 1', useValues: true, dur: 1 };
        case 'pumping':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 1.1; 1 1; 1.2 1.2; 1 1', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite' };
        case 'floatingX':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 20 0; 0 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3, additive: 'sum' };
        case 'wiggle':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; -5; 5; -5; 5; 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'flashRed':
            return { ...base, type: 'animate', attributeName: 'fill', values: 'currentColor; #ff0000; currentColor', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.2, repeatCount: 'indefinite' };
        case 'flashWhite':
            return { ...base, type: 'animate', attributeName: 'fill', values: 'currentColor; #ffffff; currentColor', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.2, repeatCount: 'indefinite' };
        case 'strobe':
            return { ...base, type: 'set', attributeName: 'visibility', to: 'hidden', dur: 0.1, repeatCount: 'indefinite' };
        case 'blink':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, repeatCount: 'indefinite' };
        case 'hueLoop':
            return { ...base, type: 'animate', attributeName: 'values', from: '0', to: '360', repeatCount: 'indefinite', dur: 10 };
        case 'saturatePulse':
            return { ...base, type: 'animate', attributeName: 'values', values: '1; 3; 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };
        case 'brightnessLoop':
            return { ...base, type: 'animate', attributeName: 'values', values: '1; 2; 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 5 };
        case 'contrastLoop':
            return { ...base, type: 'animate', attributeName: 'values', values: '1; 2; 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 4 };
        case 'expandBoth':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0 0', to: '1 1', dur: 0.8, calcMode: 'spline', keySplines: '0.175 0.885 0.32 1.275' };
        case 'skewXPulse':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 10; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };

        // Phase 5: Entrance (12)
        case 'slideInLeftBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-1000 0', to: '0 0', dur: 1.2, calcMode: 'spline', keyTimes: '0; 0.6; 0.8; 1', keySplines: '0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275', additive: 'sum' };
        case 'slideInRightBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '1000 0', to: '0 0', dur: 1.2, calcMode: 'spline', keyTimes: '0; 0.6; 0.8; 1', keySplines: '0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275', additive: 'sum' };
        case 'slideInTopBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -1000', to: '0 0', dur: 1.2, calcMode: 'spline', keyTimes: '0; 0.6; 0.8; 1', keySplines: '0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275', additive: 'sum' };
        case 'slideInBottomBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 1000', to: '0 0', dur: 1.2, calcMode: 'spline', keyTimes: '0; 0.6; 0.8; 1', keySplines: '0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1.275', additive: 'sum' };
        case 'slideInLeftElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '-1000 0; 30 0; -15 0; 5 0; 0 0', keyTimes: '0; 0.4; 0.6; 0.8; 1', useValues: true, dur: 1.5, additive: 'sum' };
        case 'slideInRightElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '1000 0; -30 0; 15 0; -5 0; 0 0', keyTimes: '0; 0.4; 0.6; 0.8; 1', useValues: true, dur: 1.5, additive: 'sum' };
        case 'slideInTopElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 -1000; 0 30; 0 -15; 0 5; 0 0', keyTimes: '0; 0.4; 0.6; 0.8; 1', useValues: true, dur: 1.5, additive: 'sum' };
        case 'slideInBottomElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 1000; 0 -30; 0 15; 0 -5; 0 0', keyTimes: '0; 0.4; 0.6; 0.8; 1', useValues: true, dur: 1.5, additive: 'sum' };
        case 'zoomInBouncy':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0.3 0.3; 1.1 1.1; 0.9 0.9; 1 1', keyTimes: '0; 0.5; 0.8; 1', useValues: true, dur: 0.8 };
        case 'zoomInElastic':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.3 1.3; 0.8 0.8; 1.1 1.1; 0.95 0.95; 1 1', keyTimes: '0; 0.3; 0.5; 0.7; 0.85; 1', useValues: true, dur: 1.2 };
        case 'popInElastic':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.5 1.5; 0.7 0.7; 1 1', keyTimes: '0; 0.4; 0.7; 1', useValues: true, dur: 0.5 };
        case 'rollIn':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '-120; 0', keyTimes: '0; 1', useValues: true, dur: 0.6, additive: 'sum' };

        // Phase 5: Exit (12)
        case 'slideOutLeftBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '-1000 0', dur: 1, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.47 0 0.745 0.715', additive: 'sum' };
        case 'slideOutRightBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '1000 0', dur: 1, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.47 0 0.745 0.715', additive: 'sum' };
        case 'slideOutTopBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 -1000', dur: 1, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.47 0 0.745 0.715', additive: 'sum' };
        case 'slideOutBottomBouncy':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 1000', dur: 1, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.47 0 0.745 0.715', additive: 'sum' };
        case 'slideOutLeftElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 20 0; -1000 0', keyTimes: '0; 0.2; 1', useValues: true, dur: 1.2, additive: 'sum' };
        case 'slideOutRightElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -20 0; 1000 0', keyTimes: '0; 0.2; 1', useValues: true, dur: 1.2, additive: 'sum' };
        case 'slideOutTopElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 20; 0 -1000', keyTimes: '0; 0.2; 1', useValues: true, dur: 1.2, additive: 'sum' };
        case 'slideOutBottomElastic':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 1000', keyTimes: '0; 0.2; 1', useValues: true, dur: 1.2, additive: 'sum' };
        case 'zoomOutBouncy':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 1.1; 0 0', keyTimes: '0; 0.3; 1', useValues: true, dur: 0.8 };
        case 'zoomOutElastic':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1.2; 0 0', keyTimes: '0; 0.2; 1', useValues: true, dur: 1 };
        case 'popOutElastic':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.4 1.4; 0 0', keyTimes: '0; 0.3; 1', useValues: true, dur: 0.5 };
        case 'rollOut':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 120', keyTimes: '0; 1', useValues: true, dur: 0.6, additive: 'sum' };

        // Phase 5: Loops & Bounces (16)
        case 'bounceHeavy':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -100; 0 0', keyTimes: '0; 0.5; 1', keySplines: '0.1 0.8 0.4 1; 0.4 0 0.9 0.2', calcMode: 'spline', useValues: true, repeatCount: 'indefinite', dur: 0.8, additive: 'sum' };
        case 'bounceLight':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 0.5, additive: 'sum' };
        case 'vibrateHeavy':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '-5 0; 5 0; -5 0; 5 0; 0 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, repeatCount: 'indefinite', dur: 0.05, additive: 'sum' };
        case 'vibrateLight':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '-1 0; 1 0; -1 0; 1 0; 0 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, repeatCount: 'indefinite', dur: 0.1, additive: 'sum' };
        case 'floatDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 30 -20; -30 20; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, repeatCount: 'indefinite', dur: 6, additive: 'sum' };
        case 'floatFigure8':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 20 -10; 40 0; 20 10; 0 0; -20 -10; -40 0; -20 10; 0 0', keyTimes: '0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1', useValues: true, repeatCount: 'indefinite', dur: 4, additive: 'sum' };
        case 'pulseSlow':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.05 1.05; 1 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 4 };
        case 'pulseFast':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1.2; 1 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 0.6 };
        case 'heartbeatDouble':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.3 1.3; 1.1 1.1; 1.4 1.4; 1 1', keyTimes: '0; 0.15; 0.3; 0.45; 1', useValues: true, repeatCount: 'indefinite', dur: 1.2 };
        case 'ringingBell':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 25; -25; 20; -20; 15; -15; 0', keyTimes: '0; 0.15; 0.3; 0.45; 0.6; 0.75; 0.9; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'pendulum':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '30; -30; 30', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3, additive: 'sum', calcMode: 'spline', keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95' };
        case 'swingTop':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 15; -15; 10; -10; 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, repeatCount: 'indefinite', dur: 2, additive: 'sum' };
        case 'wobbleHard':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -25% 0; 20% 0; -15% 0; 10% 0; -5% 0; 0 0', keyTimes: '0; 0.15; 0.3; 0.45; 0.6; 0.75; 1', useValues: true, repeatCount: 'indefinite', dur: 1, additive: 'sum' };
        case 'jelloX':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; -12.5; 6.25; -3.125; 1.5625; -0.78125; 0.390625; 0', keyTimes: '0; 0.111; 0.222; 0.333; 0.444; 0.555; 0.666; 1', useValues: true, repeatCount: 'indefinite', dur: 1, additive: 'sum' };
        case 'jelloY':
            return { ...base, type: 'animateTransform', transformType: 'skewY', values: '0; -12.5; 6.25; -3.125; 1.5625; -0.78125; 0.390625; 0', keyTimes: '0; 0.111; 0.222; 0.333; 0.444; 0.555; 0.666; 1', useValues: true, repeatCount: 'indefinite', dur: 1, additive: 'sum' };
        case 'ping':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 2.5 2.5', keyTimes: '0; 1', useValues: true, repeatCount: 'indefinite', dur: 1.5 };

        // Phase 5: 3D-Like (16)
        case 'flipInX':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 0; 1 1.2; 1 1', keyTimes: '0; 0.6; 1', useValues: true, dur: 0.6 };
        case 'flipInY':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 1; 1.2 1; 1 1', keyTimes: '0; 0.6; 1', useValues: true, dur: 0.6 };
        case 'flipOutX':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1 1.2; 1 0', keyTimes: '0; 0.3; 1', useValues: true, dur: 0.6, fill: 'freeze' };
        case 'flipOutY':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1; 0 1', keyTimes: '0; 0.3; 1', useValues: true, dur: 0.6, fill: 'freeze' };
        case 'flip3D':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0 1; 1 1; 0 1; 1 1', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'spinX':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1 0; 1 -1; 1 0; 1 1', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'spinY':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0 1; -1 1; 0 1; 1 1', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'spinZ':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'spinZCCW':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '360', to: '0', dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'tiltUp':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 15; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3, additive: 'sum' };
        case 'tiltDown':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; -15; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3, additive: 'sum' };
        case 'tiltLeft':
            return { ...base, type: 'animateTransform', transformType: 'skewY', values: '0; 15; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3, additive: 'sum' };
        case 'tiltRight':
            return { ...base, type: 'animateTransform', transformType: 'skewY', values: '0; -15; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3, additive: 'sum' };
        case 'doorOpen':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '0 1', dur: 0.8, fill: 'freeze' };
        case 'doorClose':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0 1', to: '1 1', dur: 0.8, fill: 'freeze' };
        case 'perspectiveRotateX':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1 0.2; 1 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };
        case 'perspectiveRotateY':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0.2 1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };

        // Phase 5: Filter Cycles & FX (16)
        case 'invertLoop':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; -1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'grayscaleLoop':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 0.21 0.72 0.07 0 0 0.21 0.72 0.07 0 0 0.21 0.72 0.07 0 0 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 4 };
        case 'sepiaLoop':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 0.39 0.77 0.19 0 0 0.35 0.69 0.17 0 0 0.27 0.53 0.13 0 0 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 4 };
        case 'hueLoopFast':
            return { ...base, type: 'animate', attributeName: 'values', from: '0', to: '360', dur: 1, repeatCount: 'indefinite' };
        case 'blurSubtlePulse':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '0; 2; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };
        case 'blurHeavyPulse':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '0; 15; 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'focusAuto':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', from: '10', to: '0', dur: 1.5, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.42 0 0.58 1' };
        case 'defocusAuto':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', from: '0', to: '10', dur: 1.5, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.42 0 0.58 1' };
        case 'shadowDistanceLoop':
            return { ...base, type: 'animate', attributeName: 'dx', values: '2; 15; 2', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };
        case 'shadowAngleLoop':
            return { ...base, type: 'animate', attributeName: 'dy', values: '2; 15; 2', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };
        case 'shadowColorCycle':
            return { ...base, type: 'animate', attributeName: 'flood-color', values: '#ff0000; #00ff00; #0000ff; #ff0000', keyTimes: '0; 0.33; 0.66; 1', useValues: true, repeatCount: 'indefinite', dur: 6 };
        case 'noiseStatic':
            return { ...base, type: 'animate', attributeName: 'seed', from: '1', to: '100', dur: 0.1, repeatCount: 'indefinite', calcMode: 'discrete' };
        case 'glitchExtreme':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 20 -10; -20 10; 30 0; -30 0; 0 0', keyTimes: '0; 0.1; 0.2; 0.3; 0.4; 1', useValues: true, repeatCount: 'indefinite', dur: 0.2, additive: 'sum' };
        case 'glitchSoft':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 5 -2; -5 2; 0 0', keyTimes: '0; 0.2; 0.4; 1', useValues: true, repeatCount: 'indefinite', dur: 0.5, additive: 'sum' };
        case 'flareBrightness':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 2 0 0 0 0 0 2 0 0 0 0 0 2 0 0 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 0.1 };
        case 'contrastBurn':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 3 0 0 0 -1 0 3 0 0 -1 0 3 0 0 -1 0 0 0 1 0', keyTimes: '0; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite' };

        // Phase 5: Colors & Styles (12)
        case 'rainbowFillSlow':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff0000; #ff7f00; #ffff00; #00ff00; #0000ff; #4b0082; #9400d3; #ff0000', keyTimes: '0; 0.14; 0.28; 0.42; 0.56; 0.7; 0.84; 1', useValues: true, repeatCount: 'indefinite', dur: 15 };
        case 'rainbowStrokeSlow':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#ff0000; #ff7f00; #ffff00; #00ff00; #0000ff; #4b0082; #9400d3; #ff0000', keyTimes: '0; 0.14; 0.28; 0.42; 0.56; 0.7; 0.84; 1', useValues: true, repeatCount: 'indefinite', dur: 15 };
        case 'fillFadePulse':
            return { ...base, type: 'animate', attributeName: 'fill-opacity', values: '1; 0.2; 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };
        case 'strokeFadePulse':
            return { ...base, type: 'animate', attributeName: 'stroke-opacity', values: '1; 0.2; 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 3 };
        case 'neonPulseRed':
            return { ...base, type: 'animate', attributeName: 'flood-color', values: '#ff0000; #660000; #ff0000', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1.5 };
        case 'neonPulseBlue':
            return { ...base, type: 'animate', attributeName: 'flood-color', values: '#00ffff; #006666; #00ffff', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1.5 };
        case 'neonPulseGreen':
            return { ...base, type: 'animate', attributeName: 'flood-color', values: '#00ff00; #006600; #00ff00', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1.5 };
        case 'neonPulseGold':
            return { ...base, type: 'animate', attributeName: 'flood-color', values: '#ffd700; #665c00; #ffd700', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1.5 };
        case 'dashArrayCycle':
            return { ...base, type: 'animate', attributeName: 'stroke-dasharray', values: '1,1; 10,2; 5,5; 1,1', keyTimes: '0; 0.33; 0.66; 1', useValues: true, repeatCount: 'indefinite', dur: 4 };
        case 'strokeWidthLoop':
            return { ...base, type: 'animate', attributeName: 'stroke-width', values: '1; 10; 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 2 };
        case 'drawInSlow':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 4, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.4 0 0.2 1' };
        case 'drawOutSlow':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '0', to: '1', dur: 4, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.4 0 0.2 1' };

        // Phase 5: Interactive/UX (12)
        case 'errorShake':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -10 0; 10 0; -10 0; 10 0; 0 0', keyTimes: '0; 0.1; 0.3; 0.5; 0.7; 1', useValues: true, dur: 0.4, additive: 'sum' };
        case 'successPop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.4 1.4; 1 1', keyTimes: '0; 0.3; 1', useValues: true, dur: 0.5, calcMode: 'spline', keySplines: '0.175 0.885 0.32 1.275' };
        case 'loadingSpinSubtle':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 2, repeatCount: 'indefinite', additive: 'sum', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.4 0 0.2 1' };
        case 'activeStatePulse':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0.95 0.95; 1 1', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1 };
        case 'hoverLift':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 -10', dur: 0.3, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.46 0.45 0.94' };
        case 'hoverSink':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 10', dur: 0.3, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.46 0.45 0.94' };
        case 'hoverExpand':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '1.1 1.1', dur: 0.3, fill: 'freeze' };
        case 'hoverContract':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '0.9 0.9', dur: 0.3, fill: 'freeze' };
        case 'focusOutlinePulse':
            return { ...base, type: 'animate', attributeName: 'stroke-width', values: '2; 6; 2', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1.5 };
        case 'disabledStateGray':
            return { ...base, type: 'animate', attributeName: 'values', from: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', to: '0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0.5 0', dur: 0.5, fill: 'freeze' };
        case 'urgentBlink':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff0000; #990000; #ff0000', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 0.3 };
        case 'notifyTip':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -5; 0 0', keyTimes: '0; 0.5; 1', useValues: true, repeatCount: 'indefinite', dur: 1, additive: 'sum' };

        // Phase 7: Liquid & Morph (20)
        case 'blobPulse':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.05 0.95; 0.95 1.05; 1 1', keyTimes: '0; 0.3; 0.6; 1', useValues: true, dur: 3, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.42 0 0.58 1; 0.42 0 0.58 1; 0.42 0 0.58 1' };
        case 'liquidDrip':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 10; 0 40; 0 0', keyTimes: '0; 0.2; 0.7; 1', useValues: true, dur: 2.5, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.4 0 0.6 1; 0.8 0 1 1; 0 0 0.2 1', additive: 'sum' };
        case 'waveShiftX':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 0; -10 0; 0 0', keyTimes: '0; 0.3; 0.7; 1', useValues: true, dur: 4, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95', additive: 'sum' };
        case 'waveShiftY':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 10; 0 -10; 0 0', keyTimes: '0; 0.3; 0.7; 1', useValues: true, dur: 4, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95', additive: 'sum' };
        case 'morphElastic':
            return { ...base, type: 'animate', attributeName: 'd', values: 'M0 0 L100 0; M0 -10 L100 10; M0 10 L100 -10; M0 0 L100 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'jellyWobbleX':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.25 0.75; 0.85 1.15; 1.05 0.95; 1 1', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 1.2, repeatCount: 'indefinite', additive: 'sum' };
        case 'jellyWobbleY':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0.75 1.25; 1.15 0.85; 0.95 1.05; 1 1', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 1.2, repeatCount: 'indefinite', additive: 'sum' };
        case 'organicBreath':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.03 1.03; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 5, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1' };
        case 'liquidSway':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 5; -5; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 6, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95', additive: 'sum' };
        case 'meltDown':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 0.4; 1.2 0.1; 0 0', keyTimes: '0; 0.4; 0.7; 1', useValues: true, dur: 2, fill: 'freeze', calcMode: 'spline', keySplines: '0.55 0.055 0.675 0.19; 0.55 0.055 0.675 0.19; 0.55 0.055 0.675 0.19' };
        case 'evaporateUp':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 -50; 0 -100', keyTimes: '0; 0.3; 0.7; 1', useValues: true, dur: 2, fill: 'freeze', additive: 'sum' };
        case 'plasmaFlow':
            return { ...base, type: 'animate', attributeName: 'fill-opacity', values: '0.4; 0.8; 0.5; 0.9; 0.4', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 8, repeatCount: 'indefinite' };
        case 'amoebaStretch':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 0.9; 0.9 1.1; 1.05 0.95; 1 1', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'softBounceX':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 30 0; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.19 1 0.22 1; 0.19 1 0.22 1', additive: 'sum' };
        case 'softBounceY':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 30; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.19 1 0.22 1; 0.19 1 0.22 1', additive: 'sum' };
        case 'viscousDrag':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 100 0; 80 0; 100 0', keyTimes: '0; 0.6; 0.8; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'morphTilt':
            return { ...base, type: 'animateTransform', transformType: 'skewY', values: '0; 10; -10; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 5, repeatCount: 'indefinite', additive: 'sum' };
        case 'bubblePop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1.2; 1.5 1.5; 0 0', keyTimes: '0; 0.7; 0.85; 1', useValues: true, dur: 0.4, fill: 'freeze' };
        case 'ripplingScale':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 1.1; 0.95 0.95; 1.05 1.05; 1 1', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'surfaceTension':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.02 0.98; 0.98 1.02; 1 1', keyTimes: '0; 0.25; 0.5; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite' };

        // Phase 7: Advanced Typography (20)
        case 'charSpacingExpand':
            return { ...base, type: 'animate', attributeName: 'letter-spacing', from: '0', to: '10', dur: 2, repeatCount: 'indefinite' };
        case 'charSpacingContract':
            return { ...base, type: 'animate', attributeName: 'letter-spacing', from: '10', to: '0', dur: 2, repeatCount: 'indefinite' };
        case 'fontWeightThin':
            return { ...base, type: 'animate', attributeName: 'font-weight', from: '700', to: '100', dur: 2, fill: 'freeze' };
        case 'fontWeightBold':
            return { ...base, type: 'animate', attributeName: 'font-weight', from: '100', to: '900', dur: 2, fill: 'freeze' };
        case 'textSkewStretch':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 25; -25; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'textLetterJump':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.4, repeatCount: 'indefinite', additive: 'sum' };
        case 'textLineHeightPulse':
            return { ...base, type: 'animate', attributeName: 'dy', values: '0; 5; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'textWordPop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.5 1.5; 1 1', keyTimes: '0; 0.2; 1', useValues: true, dur: 0.8, calcMode: 'spline', keySplines: '0.175 0.885 0.32 1.275' };
        case 'textTypewriterFade':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0; 1', keyTimes: '0; 1', useValues: true, dur: 0.1, fill: 'freeze' };
        case 'textGhostScroll':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 50', to: '0 -50', dur: 5, repeatCount: 'indefinite', additive: 'sum' };
        case 'textRainbowChar':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff0000; #00ff00; #0000ff; #ff0000', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'textBlurFocus':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '5; 0; 5', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'textShadowPulse':
            return { ...base, type: 'animate', attributeName: 'dx', values: '0; 4; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite' };
        case 'textOutlineDraw':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 3, fill: 'freeze' };
        case 'textWaveform':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -5; 0 5; 0 0', keyTimes: '0; 0.25; 0.75; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'textJitter':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 1 -1; -1 1; 1 1; 0 0', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite', additive: 'sum' };
        case 'textPerspectiveRotate':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1 0.1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'text3DSpinZ':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'textFloatWave':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 -10; -10 -10; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'textExpandReveal':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0 1', to: '1 1', dur: 1, calcMode: 'spline', keySplines: '0.23 1 0.32 1' };
        case 'windSwayLeft':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; -5; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum', calcMode: 'spline', keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95' };
        case 'windSwayRight':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 5; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum', calcMode: 'spline', keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95' };
        case 'flameFlickerSubtle':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.02 1.05; 0.98 1.02; 1 1', keyTimes: '0; 0.3; 0.7; 1', useValues: true, dur: 0.2, repeatCount: 'indefinite', additive: 'sum' };
        case 'flameFlickerExtreme':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 1.2; 0.9 1.1; 1.05 1.15; 1 1', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite', additive: 'sum' };
        case 'rainDropSingle':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -100', to: '0 500', dur: 0.6, repeatCount: 'indefinite', additive: 'sum' };
        case 'leafFallSpiral':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 20 50; -20 100; 20 150; 0 200', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'floatingDustFast':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 -10; -10 10; 0 0', keyTimes: '0; 0.25; 0.5; 1', useValues: true, dur: 1, repeatCount: 'indefinite', additive: 'sum' };
        case 'floatingDustSlow':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 -10; -10 10; 0 0', keyTimes: '0; 0.25; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'cloudDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-200 0', to: '800 0', dur: 20, repeatCount: 'indefinite', additive: 'sum' };
        case 'starTwinkle':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.2; 1; 0.5; 1', keyTimes: '0; 0.2; 0.5; 0.8; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'auroraWave':
            return { ...base, type: 'animate', attributeName: 'fill-opacity', values: '0.2; 0.6; 0.2', keyTimes: '0; 0.5; 1', useValues: true, dur: 10, repeatCount: 'indefinite' };
        case 'smokeDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 -20; -10 -40; 0 -60', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 5, repeatCount: 'indefinite', additive: 'sum' };
        case 'waterRipple':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1.2', keyTimes: '0; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'sunlightGlow':
            return { ...base, type: 'animate', attributeName: 'flood-opacity', values: '0.2; 0.5; 0.2', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'moonlightFade':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0.5; 0.8; 0.5', keyTimes: '0; 0.5; 1', useValues: true, dur: 6, repeatCount: 'indefinite' };
        case 'crackleStatic':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.8; 1; 0.6; 1', keyTimes: '0; 0.1; 0.3; 0.7; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite' };
        case 'thunderFlash':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0; 0; 1; 0.5; 1; 0; 0', keyTimes: '0; 0.8; 0.82; 0.84; 0.86; 0.88; 1', useValues: true, dur: 5, repeatCount: 'indefinite' };
        case 'mistSway':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '-20 0; 20 0; -20 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 12, repeatCount: 'indefinite', additive: 'sum' };
        case 'snowFlakeTumble':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'grassWaver':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 3; -3; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum' };

        // Phase 7: Pattern & Gradient (5/20)
        case 'patternSlideX':
            return { ...base, type: 'animate', attributeName: 'x', from: '0', to: '100', dur: 5, repeatCount: 'indefinite' };
        case 'patternSlideY':
            return { ...base, type: 'animate', attributeName: 'y', from: '0', to: '100', dur: 5, repeatCount: 'indefinite' };
        case 'patternZoom':
            return { ...base, type: 'animate', attributeName: 'width', from: '10', to: '50', dur: 4, repeatCount: 'indefinite' };
        case 'patternRotateInfinite':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 10, repeatCount: 'indefinite' };
        case 'gradientShiftHorizontal':
            return { ...base, type: 'animate', attributeName: 'x1', from: '0%', to: '100%', dur: 3, repeatCount: 'indefinite' };
        case 'gradientShiftVertical':
            return { ...base, type: 'animate', attributeName: 'y1', from: '0%', to: '100%', dur: 3, repeatCount: 'indefinite' };
        case 'gradientRotate360':
            return { ...base, type: 'animateTransform', attributeName: 'gradientTransform', transformType: 'rotate', from: '0', to: '360', dur: 10, repeatCount: 'indefinite' };
        case 'gradientStopColorBlink':
            return { ...base, type: 'animate', attributeName: 'stop-color', values: '#ff0000; #ffffff; #ff0000', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite' };
        case 'gradientStopOffsetPulse':
            return { ...base, type: 'animate', attributeName: 'offset', values: '0%; 50%; 0%', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'shimmerOverlay':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-100% 0', to: '200% 0', dur: 2, repeatCount: 'indefinite' };
        case 'patternFlowVertical':
            return { ...base, type: 'animate', attributeName: 'y', from: '0', to: '-100', dur: 2, repeatCount: 'indefinite' };
        case 'patternFlowHorizontal':
            return { ...base, type: 'animate', attributeName: 'x', from: '0', to: '-100', dur: 2, repeatCount: 'indefinite' };
        case 'gradientVignettePulse':
            return { ...base, type: 'animate', attributeName: 'r', values: '50%; 70%; 50%', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'gradientGlowCenter':
            return { ...base, type: 'animate', attributeName: 'cx', values: '50%; 55%; 45%; 50%', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'patternSkewCycle':
            return { ...base, type: 'animateTransform', attributeName: 'patternTransform', transformType: 'skewX', values: '0; 20; -20; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 5, repeatCount: 'indefinite' };
        case 'patternDistort':
            return { ...base, type: 'animateTransform', attributeName: 'patternTransform', transformType: 'scale', values: '1 1; 1.2 0.8; 0.8 1.2; 1 1', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'gradientContrastCycle':
            return { ...base, type: 'animate', attributeName: 'stop-color', values: '#000000; #ffffff; #000000', keyTimes: '0; 0.5; 1', useValues: true, dur: 5, repeatCount: 'indefinite' };
        case 'gradientSaturationCycle':
            return { ...base, type: 'animate', attributeName: 'stop-color', values: '#888888; #ff0000; #888888', keyTimes: '0; 0.5; 1', useValues: true, dur: 5, repeatCount: 'indefinite' };
        case 'patternOpacityPulse':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.2; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'gradientAngleSweep':
            return { ...base, type: 'animateTransform', attributeName: 'gradientTransform', transformType: 'rotate', from: '0', to: '180', dur: 4, repeatCount: 'indefinite', additive: 'sum' };

        // Phase 7: Advanced UI/UX (10/20)
        case 'dragHintHorizontal':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 20 0; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'dragHintVertical':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 20; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'dropIndicatorPulse':
            return { ...base, type: 'animate', attributeName: 'stroke-opacity', values: '0.4; 1; 0.4', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, repeatCount: 'indefinite' };
        case 'scanLineDown':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -100%', to: '0 200%', dur: 2, repeatCount: 'indefinite' };
        case 'scanLineUp':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 200%', to: '0 -100%', dur: 2, repeatCount: 'indefinite' };
        case 'focusGlowPulse':
            return { ...base, type: 'animate', attributeName: 'flood-opacity', values: '0.3; 0.8; 0.3', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite' };
        case 'notifyShakeHard':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -15 0; 15 0; -15 0; 15 0; 0 0', keyTimes: '0; 0.1; 0.3; 0.5; 0.7; 1', useValues: true, dur: 0.3, repeatCount: '3', additive: 'sum' };
        case 'notifyShakeSoft':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -5 0; 5 0; -5 0; 5 0; 0 0', keyTimes: '0; 0.1; 0.3; 0.5; 0.7; 1', useValues: true, dur: 0.4, repeatCount: '2', additive: 'sum' };
        case 'errorBlinkRed':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff0000; transparent; #ff0000; transparent; #ff0000', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 0.5, fill: 'freeze' };
        case 'successBlinkGreen':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#00ff00; transparent; #00ff00; transparent; #00ff00', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 0.5, fill: 'freeze' };
        case 'savingSpinner':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 1, repeatCount: 'indefinite', additive: 'sum', calcMode: 'linear' };
        case 'uploadPulse':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, repeatCount: 'indefinite', additive: 'sum' };
        case 'downloadArrowFlow':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 -20; 0 20', keyTimes: '0; 1', useValues: true, dur: 1, repeatCount: 'indefinite', additive: 'sum' };
        case 'searchPulse':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1.2; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite' };
        case 'buttonPressScale':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '0.9 0.9', dur: 0.1, fill: 'freeze' };
        case 'buttonReleaseSpring':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0.9 0.9; 1.1 1.1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.3, fill: 'freeze' };
        case 'toggleSwitchGlide':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '30 0', dur: 0.3, fill: 'freeze' };
        case 'tooltipPop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.1 1.1; 1 1', keyTimes: '0; 0.7; 1', useValues: true, dur: 0.3, fill: 'freeze' };
        case 'contextMenuReveal':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -10', to: '0 0', dur: 0.3, fill: 'freeze', additive: 'sum' };
        case 'selectionGlow':
            return { ...base, type: 'animate', attributeName: 'stroke-opacity', values: '0.2; 0.8; 0.2', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };

        // Phase 8: Geometric & Mathematical (20)
        case 'spiralGrowth':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 0.5 0.5; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, calcMode: 'spline', keySplines: '0.42 0 0.58 1; 0.42 0 0.58 1' };
        case 'sineWavePath':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -10; 0 0; 0 10; 0 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'fractalZoom':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 2 2; 4 4', keyTimes: '0; 0.5; 1', useValues: true, dur: 5, repeatCount: 'indefinite' };
        case 'geometricPulse':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 1.1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'squareRotateSubtle':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '90', dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'circleOrbit':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 30 0; 30 30; 0 30; 0 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'starExpand':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0.5 0.5; 1.5 1.5; 0.5 0.5', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'polygonShift':
            return { ...base, type: 'animate', attributeName: 'd', values: 'M0 0 L100 0 L50 100 Z; M100 0 L100 100 L0 50 Z; M0 0 L100 0 L50 100 Z', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'gridExpand':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0.9 0.9; 1.1 1.1; 0.9 0.9', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'dotMatrixPulse':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0.5; 1; 0.5', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'lissajousMotion':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 20 10; 0 20; -20 10; 0 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 5, repeatCount: 'indefinite', additive: 'sum' };
        case 'fibonacciSpiral':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 8, repeatCount: 'indefinite', additive: 'sum', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.42 0 0.58 1' };
        case 'tessellationFade':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.3; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'kaleidoscopeSpin':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 6, repeatCount: 'indefinite', additive: 'sum' };
        case 'vectorDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 5 -5; -5 5; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 6, repeatCount: 'indefinite', additive: 'sum' };
        case 'radialBurst':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.5 1.5', keyTimes: '0; 1', useValues: true, dur: 1, fill: 'freeze' };
        case 'concentricPulse':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.3 1.3; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 2.5, repeatCount: 'indefinite' };
        case 'hypocycloidDraw':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 5, fill: 'freeze' };
        case 'epiCycleMove':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 40 0; 20 35; -20 35; -40 0; -20 -35; 20 -35; 0 0', keyTimes: '0; 0.14; 0.28; 0.42; 0.57; 0.71; 0.85; 1', useValues: true, dur: 8, repeatCount: 'indefinite', additive: 'sum' };
        case 'goldenRatioScale':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.618 1.618; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };

        // Phase 8: Retro & Synthwave (20/40)
        case 'vhsGlitch':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 2; -8 -2; 5 1; 0 0', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 0.15, repeatCount: 'indefinite', additive: 'sum' };
        case 'neonFlickerFast':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.4; 1; 0.6; 1', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite' };
        case 'neonFlickerSlow':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.7; 1; 0.8; 1', keyTimes: '0; 0.3; 0.5; 0.8; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite' };
        case 'gridShiftZ':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 0.9 0.9; 1.1 1.1; 1 1', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'scanlineInterference':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 200', dur: 1.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'crtDistortion':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 2; -2; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'retroCyberSpin':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'synthwavePulse':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff00ff; #00ffff; #ff00ff', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'arcadeFlash':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.3, repeatCount: 'indefinite' };
        case 'pixelateIn':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 0.5 0.5; 1 1', keyTimes: '0; 0.7; 1', useValues: true, dur: 1, fill: 'freeze', calcMode: 'discrete' };
        case 'retroWaveScroll':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 -500', dur: 10, repeatCount: 'indefinite', additive: 'sum' };
        case 'cyanMagentaSplit':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 3 0; -3 0; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.2, repeatCount: 'indefinite', additive: 'sum' };
        case 'eightBitJump':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -30; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.4, calcMode: 'discrete' };
        case 'glitchBars':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0; 1; 0; 1', keyTimes: '0; 0.1; 0.2; 0.3; 1', useValues: true, dur: 0.05, repeatCount: 'indefinite' };
        case 'staticNoiseOverlay':
            return { ...base, type: 'animate', attributeName: 'seed', from: '1', to: '100', dur: 0.05, repeatCount: 'indefinite', calcMode: 'discrete' };
        case 'retroZoom':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '3 3', dur: 2, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.68 -0.55 0.265 1.55' };
        case 'gridWarp':
            return { ...base, type: 'animateTransform', transformType: 'skewY', values: '0; 10; -10; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'pixelDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 2 0; -2 0; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite', additive: 'sum', calcMode: 'discrete' };
        case 'eightBitFade':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.5; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, fill: 'freeze', calcMode: 'discrete' };
        case 'retroShadowExtrude':
            return { ...base, type: 'animate', attributeName: 'dx', values: '0; 10; 20', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, fill: 'freeze' };
        case 'vhsColorBleed':
            return { ...base, type: 'animate', attributeName: 'flood-color', values: '#ff0000; #00ff00; #0000ff; #ff0000', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.3, repeatCount: 'indefinite' };
        case 'scanlineRoll':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -50', to: '0 300', dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'crtScanlines':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0.8; 1; 0.8', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.05, repeatCount: 'indefinite' };
        case 'retroGlowPulse':
            return { ...base, type: 'animate', attributeName: 'flood-opacity', values: '0.3; 1; 0.3', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'analogDistortion':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 3; -3; 1; 0', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 0.4, repeatCount: 'indefinite', additive: 'sum' };
        case 'cyberDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 100 0; 100 100; 0 100; 0 0', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 10, repeatCount: 'indefinite', additive: 'sum' };
        case 'synthShift':
            return { ...base, type: 'animate', attributeName: 'fill', values: '#ff006e; #8338ec; #3a86ff; #ff006e', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'arcadePop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.3 1.3; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.3 };
        case 'neonPathDraw':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 3, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.42 0 0.58 1' };
        case 'retroTilt':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; -3; 3; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'vintageSepiaFlicker':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 0.39 0.77 0.19 0 0 0.35 0.69 0.17 0 0 0.27 0.53 0.13 0 0 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.2, repeatCount: 'indefinite' };
        case 'oldFilmShake':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -2 1; 2 -1; -1 2; 1 -2; 0 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite', additive: 'sum' };
        case 'pixelStretch':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 0.8; 0.8 1.2; 1 1', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite', calcMode: 'discrete' };
        case 'retroBounce':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -20; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.6, repeatCount: 'indefinite', additive: 'sum', calcMode: 'discrete' };
        case 'eightBitSpin':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 1, repeatCount: 'indefinite', additive: 'sum', calcMode: 'discrete' };
        case 'vhsPauseLine':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.5; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.05, repeatCount: 'indefinite' };
        case 'gridRotate':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 90; 180; 270; 360', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 8, repeatCount: 'indefinite', additive: 'sum', calcMode: 'discrete' };
        case 'neonFlickerExtreme':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0; 1; 0; 1; 0.5; 1', keyTimes: '0; 0.1; 0.2; 0.3; 0.5; 0.7; 1', useValues: true, dur: 0.05, repeatCount: 'indefinite' };
        case 'retroWaveFloat':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -15; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'cyberPulse':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#00ffff; #ff00ff; #00ffff', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };

        // Phase 8: Cinematic & Dramatic (25/40)
        case 'lensFlareDrive':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-100 0', to: '200 0', dur: 2, fill: 'freeze', additive: 'sum' };
        case 'moodyFadeIn':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '0.8', dur: 3, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.1 0.25 1' };
        case 'moodyFadeOut':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '1', to: '0.2', dur: 3, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.1 0.25 1' };
        case 'letterboxSlideIn':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -100', to: '0 0', dur: 1.5, fill: 'freeze', additive: 'sum' };
        case 'letterboxSlideOut':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 -100', dur: 1.5, fill: 'freeze', additive: 'sum' };
        case 'filmGrainOverlay':
            return { ...base, type: 'animate', attributeName: 'seed', from: '1', to: '1000', dur: 0.05, repeatCount: 'indefinite', calcMode: 'discrete' };
        case 'panoramicSlow':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '-500 0', dur: 15, additive: 'sum' };
        case 'dramaticZoom':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '1.5 1.5', dur: 3, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.1 0.25 1' };
        case 'cinematicSoftFocus':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', from: '0', to: '5', dur: 2, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.1 0.25 1' };
        case 'anamorphicStretch':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 2 1; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 3 };
        case 'slowMoReveal':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '1', dur: 4, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0 0 0.2 1' };
        case 'cameraShakeHeavy':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -8 5; 7 -4; -6 3; 5 -5; 0 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.4, repeatCount: 'indefinite', additive: 'sum' };
        case 'cameraShakeLight':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; -2 1; 2 -1; -1 1; 1 -1; 0 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.6, repeatCount: 'indefinite', additive: 'sum' };
        case 'shutterBlink':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.05 };
        case 'vignettePulse':
            return { ...base, type: 'animate', attributeName: 'r', values: '60%; 80%; 60%', keyTimes: '0; 0.5; 1', useValues: true, dur: 5, repeatCount: 'indefinite' };
        case 'cinematicTiltShift':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '0 0; 0 8; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'filmIntroRoll':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '500 0', to: '0 0', dur: 2, fill: 'freeze', additive: 'sum' };
        case 'creditScrollUp':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 500', to: '0 -500', dur: 20, additive: 'sum' };
        case 'focusPull':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '8; 0; 8', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, calcMode: 'spline', keySplines: '0.42 0 0.58 1; 0.42 0 0.58 1' };
        case 'dramaticColorShift':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 1 0 0 0 0.2 0 1 0 0 -0.1 0 0 1 0 0.1 0 0 0 1 0', keyTimes: '0; 1', useValues: true, dur: 2 };
        case 'cinematicFadeBlack':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '1', to: '0', dur: 2, fill: 'freeze' };
        case 'cinematicFadeWhite':
            return { ...base, type: 'animate', attributeName: 'fill', from: 'currentColor', to: '#ffffff', dur: 2, fill: 'freeze' };
        case 'hollywoodZoom':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '0.5 0.5', dur: 1.5, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.5 0 0.5 1' };
        case 'depthOfFieldBlur':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '0; 10; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 3 };
        case 'dramaticPush':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '1.3 1.3', dur: 2, fill: 'freeze' };
        case 'cinematicPanLeft':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '-300 0', dur: 10, additive: 'sum' };
        case 'cinematicPanRight':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '300 0', dur: 10, additive: 'sum' };
        case 'noirContrast':
            return { ...base, type: 'animate', attributeName: 'values', from: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', to: '3 0 0 0 -0.8 0 3 0 0 -0.8 0 0 3 0 -0.8 0 0 0 1 0', dur: 2 };
        case 'sepiaDrama':
            return { ...base, type: 'animate', attributeName: 'values', from: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', to: '0.4 0.8 0.2 0 0 0.35 0.7 0.17 0 0 0.27 0.54 0.13 0 0 0 0 0 1 0', dur: 1.5 };
        case 'overexposedFlash':
            return { ...base, type: 'animate', attributeName: 'values', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0; 3 0 0 0 0.5 0 3 0 0 0.5 0 0 3 0 0.5 0 0 0 1 0; 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', keyTimes: '0; 0.2; 1', useValues: true, dur: 0.5 };
        case 'blueHourFade':
            return { ...base, type: 'animate', attributeName: 'fill', from: 'currentColor', to: '#1e3a8a', dur: 3 };
        case 'goldenHourGlow':
            return { ...base, type: 'animate', attributeName: 'flood-color', from: '#ffffff', to: '#fbbf24', dur: 3 };
        case 'dramaticShadowLong':
            return { ...base, type: 'animate', attributeName: 'dx', from: '2', to: '50', dur: 3, fill: 'freeze' };
        case 'cinematicLetterboxPulse':
            return { ...base, type: 'animate', attributeName: 'height', values: '20; 40; 20', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'motionBlurDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '100 0', dur: 2, additive: 'sum' };
        case 'slowRevealDraw':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 5, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.4 0 0.2 1' };
        case 'cinematicIntroScale':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0 0', to: '1 1', dur: 2, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.175 0.885 0.32 1' };
        case 'dramaticEntrance':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-500 0', to: '0 0', dur: 2, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.46 0.45 0.94' };
        case 'epicScaleUp':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0.5 0.5', to: '2 2', dur: 3, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.175 0.885 0.32 1.275' };
        case 'heroicRotate':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '-180', to: '0', dur: 2, fill: 'freeze', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.175 0.885 0.32 1', additive: 'sum' };

        // Phase 8: Artistic & Sketchy (40)
        case 'pencilWobble':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 1; -1; 0.5; -0.5; 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.2, repeatCount: 'indefinite', additive: 'sum' };
        case 'watercolorBleed':
            return { ...base, type: 'animate', attributeName: 'flood-opacity', values: '0.8; 0.4; 0.8', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'inkSplatPop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.5 1.5; 1.2 1.2; 1 1', keyTimes: '0; 0.3; 0.7; 1', useValues: true, dur: 0.5 };
        case 'brushStrokeDraw':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 2, fill: 'freeze' };
        case 'textureJive':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 1 -1; -1 1; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite', additive: 'sum' };
        case 'charcoalDrift':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0.7; 0.9; 0.7', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'pastelGlow':
            return { ...base, type: 'animate', attributeName: 'flood-opacity', values: '0.5; 0.9; 0.5', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'markerScribble':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 3; -3; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.3, repeatCount: 'indefinite', additive: 'sum' };
        case 'stippleFade':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '1', to: '0.3', dur: 2 };
        case 'crayonRoughEase':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 2 0; -2 0; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'artisticRoughEdges':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '0; 2; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'inkWashIn':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '0.8', dur: 2, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.1 0.25 1' };
        case 'watercolorFadeOut':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '1', to: '0.2', dur: 2.5, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.1 0.25 1' };
        case 'sketchedLineDraw':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 3, fill: 'freeze', calcMode: 'linear' };
        case 'vibrantSplatter':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 2 2; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.6 };
        case 'canvasTexturePulse':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0.8; 1; 0.8', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'oilPaintDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 3 -3; -3 3; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 5, repeatCount: 'indefinite', additive: 'sum' };
        case 'acrylicPop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.2 1.2; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.4 };
        case 'sketchyPerspective':
            return { ...base, type: 'animateTransform', transformType: 'skewY', values: '0; 5; -5; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'artisticRoll':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 5; -5; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'inkDripSlow':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 50', dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'watercolorPulse':
            return { ...base, type: 'animate', attributeName: 'fill-opacity', values: '0.6; 1; 0.6', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite' };
        case 'pencilShade':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0.5; 0.8; 0.5', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'sketchyBounce':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -15; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.8, repeatCount: 'indefinite', additive: 'sum' };
        case 'scribbleExpand':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0.8 0.8', to: '1.2 1.2', dur: 0.5 };
        case 'artisticFloat':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -10; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'inkSpread':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '1.5 1.5', dur: 2 };
        case 'watercolorWave':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 4; -4; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 5, repeatCount: 'indefinite', additive: 'sum' };
        case 'pencilTilt':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 3; -3; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'sketchySpin':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'markerStrokeIn':
            return { ...base, type: 'animate', attributeName: 'stroke-dashoffset', from: '1', to: '0', dur: 1.5, fill: 'freeze' };
        case 'stippleSpiral':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '720', dur: 6, additive: 'sum' };
        case 'artisticSkew':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 10; -10; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'inkBurst':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.5 1.5; 1 1', keyTimes: '0; 0.6; 1', useValues: true, dur: 0.7 };
        case 'watercolorShimmer':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0.6; 1; 0.6; 0.9; 0.6', keyTimes: '0; 0.2; 0.4; 0.7; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'pencilVibrate':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 1 0; -1 0; 0 1; 0 -1; 0 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.1, repeatCount: 'indefinite', additive: 'sum' };
        case 'sketchyDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 5 0; -5 0; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 5, repeatCount: 'indefinite', additive: 'sum' };
        case 'markerWobble':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 2; -2; 1; -1; 0', keyTimes: '0; 0.2; 0.4; 0.6; 0.8; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'artisticSwing':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; -8; 8; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'inkReveal':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '1', dur: 1.5, fill: 'freeze' };

        // Phase 8: Modern Minimalist UI (40)
        case 'microSlideIn':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '-20 0', to: '0 0', dur: 0.3, fill: 'freeze', additive: 'sum', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.46 0.45 0.94' };
        case 'microSlideOut':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '20 0', dur: 0.3, fill: 'freeze', additive: 'sum', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.55 0.055 0.675 0.19' };
        case 'smoothOvershoot':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.1 1.1; 1 1', keyTimes: '0; 0.7; 1', useValues: true, dur: 0.5, calcMode: 'spline', keySplines: '0.175 0.885 0.32 1.275; 0.175 0.885 0.32 1' };
        case 'subtleGlint':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 1.2; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.3 };
        case 'cleanFocus':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', from: '2', to: '0', dur: 0.3, fill: 'freeze' };
        case 'edgeGlowPulse':
            return { ...base, type: 'animate', attributeName: 'stroke-opacity', values: '0.3; 0.7; 0.3', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'minimalistPop':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '0 0; 1.05 1.05; 1 1', keyTimes: '0; 0.7; 1', useValues: true, dur: 0.4 };
        case 'uiSoftReveal':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '1', dur: 0.4, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.46 0.45 0.94' };
        case 'elegantSlide':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 -15', to: '0 0', dur: 0.4, fill: 'freeze', additive: 'sum', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.25 0.46 0.45 0.94' };
        case 'preciseScale':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0.95 0.95', to: '1 1', dur: 0.3, fill: 'freeze' };
        case 'subtleShadowHover':
            return { ...base, type: 'animate', attributeName: 'dy', from: '2', to: '5', dur: 0.3, fill: 'freeze' };
        case 'cleanFadeIn':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '1', dur: 0.3 };
        case 'minimalistBlink':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.5; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.4 };
        case 'uiFloat':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -5; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'smoothContract':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '0.95 0.95', dur: 0.2, fill: 'freeze' };
        case 'elegantRotate':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 5, repeatCount: 'indefinite', additive: 'sum', calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.4 0 0.2 1' };
        case 'microBounce':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -8; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.4, additive: 'sum' };
        case 'cleanPerspective':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1 0.95; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.6 };
        case 'uiScanLine':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 100', dur: 1.5, repeatCount: 'indefinite', additive: 'sum' };
        case 'subtleParallax':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 0; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'modernGlowIn':
            return { ...base, type: 'animate', attributeName: 'flood-opacity', from: '0', to: '0.5', dur: 0.5 };
        case 'preciseDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 3 0; -3 0; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'minimalistSkew':
            return { ...base, type: 'animateTransform', transformType: 'skewX', values: '0; 2; -2; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'uiSoftElastic':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.05 1.05; 0.98 0.98; 1 1', keyTimes: '0; 0.4; 0.7; 1', useValues: true, dur: 0.6 };
        case 'cleanReveal':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0 1', to: '1 1', dur: 0.4, fill: 'freeze' };
        case 'elegantTilt':
            return { ...base, type: 'animateTransform', transformType: 'rotate', values: '0; 2; -2; 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum' };
        case 'microShift':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '5 0', dur: 0.2, fill: 'freeze', additive: 'sum' };
        case 'subtleExpansion':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '1.02 1.02', dur: 0.3, fill: 'freeze' };
        case 'modernShadowSweep':
            return { ...base, type: 'animate', attributeName: 'dx', from: '2', to: '10', dur: 0.5, fill: 'freeze' };
        case 'uiGlassmorphismPulse':
            return { ...base, type: 'animate', attributeName: 'stdDeviation', values: '3; 6; 3', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite' };
        case 'cleanContract':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '0.98 0.98', dur: 0.2, fill: 'freeze' };
        case 'elegantFloat':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 0 -8; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 3, repeatCount: 'indefinite', additive: 'sum', calcMode: 'spline', keySplines: '0.4 0 0.2 1; 0.4 0 0.2 1' };
        case 'microScale':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '1 1', to: '1.05 1.05', dur: 0.2, fill: 'freeze' };
        case 'subtlePulseIn':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '1', dur: 0.5, calcMode: 'spline', keyTimes: '0; 1', keySplines: '0.4 0 0.2 1' };
        case 'modernReveal':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 10', to: '0 0', dur: 0.4, fill: 'freeze', additive: 'sum' };
        case 'uiPrecisionMove':
            return { ...base, type: 'animateTransform', transformType: 'translate', from: '0 0', to: '0 3', dur: 0.2, fill: 'freeze', additive: 'sum' };
        case 'cleanRotate':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '90', dur: 0.4, fill: 'freeze', additive: 'sum' };
        case 'elegantExpand':
            return { ...base, type: 'animateTransform', transformType: 'scale', from: '0.9 0.9', to: '1 1', dur: 0.4, fill: 'freeze' };
        case 'microBlink':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.7; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.3 };
        case 'subtleReveal':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '0.9', dur: 0.4 };

        // Phase 8: Utility & Debug (20)
        case 'highlightCheckRed':
            return { ...base, type: 'animate', attributeName: 'fill', from: 'currentColor', to: '#ff0000', dur: 0.2, fill: 'freeze' };
        case 'highlightCheckGreen':
            return { ...base, type: 'animate', attributeName: 'fill', from: 'currentColor', to: '#00ff00', dur: 0.2, fill: 'freeze' };
        case 'boundaryPulse':
            return { ...base, type: 'animate', attributeName: 'stroke-opacity', values: '0.3; 1; 0.3', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite' };
        case 'anchorSpin':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'originMarker':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.3 1.3; 1 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, repeatCount: 'indefinite' };
        case 'debugWireframePulse':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#00ff00; #ff00ff; #00ff00', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'layoutGridFlash':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '0; 1; 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite' };
        case 'alignmentAssist':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 5 0; -5 0; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'elementTracker':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#ffff00; #ff0000; #ffff00', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, repeatCount: 'indefinite' };
        case 'debugBlink':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 0.5, repeatCount: 'indefinite' };
        case 'rulerMarkDrift':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 10 0; 0 0', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'guideLineGlow':
            return { ...base, type: 'animate', attributeName: 'stroke-opacity', values: '0.5; 1; 0.5', keyTimes: '0; 0.5; 1', useValues: true, dur: 1.5, repeatCount: 'indefinite' };
        case 'paddingPulse':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#00ffff; #0000ff; #00ffff', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'marginPulse':
            return { ...base, type: 'animate', attributeName: 'stroke', values: '#ff00ff; #ff0000; #ff00ff', keyTimes: '0; 0.5; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'zIndexSwap':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.3; 1', keyTimes: '0; 0.5; 1', useValues: true, dur: 1, repeatCount: 'indefinite' };
        case 'opacityCheck':
            return { ...base, type: 'animate', attributeName: 'opacity', values: '1; 0.5; 1; 0.2; 1', keyTimes: '0; 0.25; 0.5; 0.75; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'sizeTracker':
            return { ...base, type: 'animateTransform', transformType: 'scale', values: '1 1; 1.1 1.1; 0.9 0.9; 1 1', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite' };
        case 'positionTracker':
            return { ...base, type: 'animateTransform', transformType: 'translate', values: '0 0; 5 5; -5 -5; 0 0', keyTimes: '0; 0.33; 0.66; 1', useValues: true, dur: 2, repeatCount: 'indefinite', additive: 'sum' };
        case 'debugRotation':
            return { ...base, type: 'animateTransform', transformType: 'rotate', from: '0', to: '360', dur: 4, repeatCount: 'indefinite', additive: 'sum' };
        case 'idTagReveal':
            return { ...base, type: 'animate', attributeName: 'opacity', from: '0', to: '1', dur: 0.3, fill: 'freeze' };

        default:
            return base;
    }
};

const toOptional = (value?: string): string | undefined =>
    value && value.trim().length > 0 ? value : undefined;

/**
 * Build a normalized animation payload from a preset config.
 * This mirrors the defaults used in the workspace editor so both entry points create identical animations.
 */
export const buildPresetAnimation = (
    preset: AnimationSelectValue,
    fallbackTargetId: string
): Omit<SVGAnimation, 'id'> => {
    const config = getPresetConfig(preset);
    const targetElementId = config.targetId ?? fallbackTargetId;
    const useValues = Boolean(config.useValues && config.values);
    const repeat =
        config.repeatCount === 'indefinite'
            ? 'indefinite'
            : typeof config.repeatCount === 'number'
                ? config.repeatCount
                : Number.isFinite(Number(config.repeatCount))
                    ? Number(config.repeatCount)
                    : 1;

    return {
        targetElementId,
        type: config.type ?? 'animate',
        attributeName:
            config.type === 'animateTransform'
                ? config.attributeName ?? 'transform'
                : config.attributeName,
        transformType: config.transformType,
        from: useValues ? undefined : config.from,
        to: useValues ? undefined : config.to,
        values: useValues ? config.values : undefined,
        dur: `${config.dur ?? 2}s`,
        repeatCount: repeat === 'indefinite' ? 'indefinite' : repeat || 1,
        fill: config.fill ?? 'freeze',
        calcMode: config.calcMode ?? 'linear',
        keyTimes: toOptional(config.keyTimes),
        keySplines: toOptional(config.keySplines),
        keyPoints: toOptional(config.keyPoints),
        additive: config.additive ?? 'replace',
        accumulate: config.accumulate ?? 'none',
        path: config.mpath ? undefined : config.path,
        mpath: config.mpath,
        rotate: config.rotate as SVGAnimation['rotate'],
        begin: '0s',
    };
};
