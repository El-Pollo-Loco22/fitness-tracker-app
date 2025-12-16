/* ===========================
   FITNESS TRACKING APP
   Mobile-First Application
   =========================== */

// Hard-coded User Profile
const USER_PROFILE = {
    age: 31,
    height: "6'1\"",
    heightInches: 73,
    weight: 175,
    goals: {
        calories: 2100,
        protein: 160,
        carbs: 200,
        fat: 70,
        water: 8 // glasses per day
    },
    programDuration: 7, // months
    diet: "pescatarian"
};

// Workout Schedule (by day of week: 0 = Sunday, 1 = Monday, etc.)
const WORKOUT_SCHEDULE = {
    0: { type: 'rest', name: 'Rest Day' }, // Sunday
    1: { type: 'workout', name: 'Workout A - Legs & Chest', workoutKey: 'workoutA' }, // Monday
    2: { type: 'workout', name: 'Cardio Day', workoutKey: 'cardioDay' }, // Tuesday
    3: { type: 'workout', name: 'Workout B - Back & Press', workoutKey: 'workoutB' }, // Wednesday
    4: { type: 'rest', name: 'Rest Day' }, // Thursday
    5: { type: 'workout', name: 'Workout C - Legs & Chest', workoutKey: 'workoutC' }, // Friday
    6: { type: 'workout', name: 'Cardio Day', workoutKey: 'cardioDay' } // Saturday
};

// Workout Data
const WORKOUTS = {
    workoutA: {
        name: 'Workout A - Legs & Chest',
        exercises: [
            { name: 'Barbell Squat', sets: 4, reps: '8-10', weight: true, notes: 'Full depth, controlled tempo' },
            { name: 'Bench Press', sets: 4, reps: '8-10', weight: true, notes: 'Touch chest, full lockout' },
            { name: 'Cable Row', sets: 3, reps: '10-12', weight: true, notes: 'Pull to sternum, squeeze' },
            { name: 'Dumbbell Lunges', sets: 3, reps: '10 each leg', weight: true, notes: 'Step forward, knee to 90°' },
            { name: 'Triceps Pushdown', sets: 3, reps: '12-15', weight: true, notes: 'Full extension, control' }
        ]
    },
    workoutB: {
        name: 'Workout B - Back & Press',
        exercises: [
            { name: 'Pull-ups', sets: 4, reps: '6-10', weight: true, notes: 'Wide grip, full range' },
            { name: 'Romanian Deadlift', sets: 4, reps: '8-10', weight: true, notes: 'Hinge at hips, tight back' },
            { name: 'Incline Press', sets: 3, reps: '10-12', weight: true, notes: '30-45° angle' },
            { name: 'Overhead Press', sets: 3, reps: '8-10', weight: true, notes: 'Strict form, no leg drive' },
            { name: 'Bicep Curl', sets: 3, reps: '12-15', weight: true, notes: 'No swinging, controlled' }
        ]
    },
    workoutC: {
        name: 'Workout C - Legs & Chest',
        exercises: [
            { name: 'Leg Press', sets: 4, reps: '12-15', weight: true, notes: 'Full range, push through heels' },
            { name: 'Deadlifts', sets: 4, reps: '6-8', weight: true, notes: 'Conventional or sumo, neutral spine' },
            { name: 'Chest Fly', sets: 3, reps: '12-15', weight: true, notes: 'Dumbbell or cable variation' },
            { name: 'Lateral Raise', sets: 3, reps: '12-15', weight: true, notes: 'Control tempo, slight bend' },
            { name: 'Leg Extension', sets: 3, reps: '15-20', weight: true, notes: 'Squeeze at top, slow negative' }
        ]
    },
    cardioDay: {
        name: 'Cardio Day',
        exercises: [
            { name: 'Cardio', sets: 1, reps: '30-40 min', weight: false, notes: 'Running, cycling, or rowing at moderate intensity' },
            { name: 'Leg Raises', sets: 3, reps: '15-20', weight: false, notes: 'Hanging or lying variation' },
            { name: 'Cable Crunches', sets: 3, reps: '15-20', weight: true, notes: 'Pull down with abs, not arms' },
            { name: 'Plank', sets: 3, reps: '60 sec', weight: false, notes: 'Hold tight core, straight line' },
            { name: 'Arm Finisher', sets: 3, reps: '21s', weight: true, notes: '7 bottom half + 7 top half + 7 full range curls' }
        ]
    }
};

// API Configuration for Meal Calculator
const USE_MOCK_API = true; // Toggle between mock and real API
const API_KEY = 'brLV1/xgRaF9VMlFX6AFuw==SffD1WeMIFhAzdg6';
const API_URL = 'https://api.calorieninjas.com/v1/nutrition';

// Performance Utilities
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// State Management
let currentView = 'workout-view';
let todayData = null;
let lastNutritionResult = null; // Store last calculated meal nutrition

// Rest Timer State
let restTimerActive = false;
let restTimerRemaining = 75; // seconds (default 75s = 1:15)
let restTimerInterval = null;
let restTimerExerciseIndex = null; // Track which exercise the timer is for
let timerDuration = 75; // Customizable duration (60, 75, or 120)

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadTodayData();
    renderCurrentView();
});

function initializeApp() {
    // Initialize localStorage if needed
    if (!localStorage.getItem('fitnessData')) {
        const initialData = {
            logs: [],
            streak: 0,
            startDate: new Date().toISOString()
        };
        localStorage.setItem('fitnessData', JSON.stringify(initialData));
    }

    // Load saved timer duration preference
    const savedDuration = localStorage.getItem('timerDuration');
    if (savedDuration) {
        timerDuration = parseInt(savedDuration);
        restTimerRemaining = timerDuration;
    }
}

function setupEventListeners() {
    // Navigation - Add null checks for all elements
    const navProgressBtn = document.getElementById('nav-progress-btn');
    if (navProgressBtn) {
        navProgressBtn.addEventListener('click', () => {
            switchView('progress-view');
        });
    }

    const backToWorkoutBtn = document.getElementById('back-to-workout-btn');
    if (backToWorkoutBtn) {
        backToWorkoutBtn.addEventListener('click', () => {
            switchView(getTodaySchedule().type === 'rest' ? 'rest-day-view' : 'workout-view');
        });
    }

    // Workout completion
    const completeWorkoutBtn = document.getElementById('complete-workout-btn');
    if (completeWorkoutBtn) {
        completeWorkoutBtn.addEventListener('click', completeWorkout);
    }

    const logRestDayBtn = document.getElementById('log-rest-day-btn');
    if (logRestDayBtn) {
        logRestDayBtn.addEventListener('click', logRestDay);
    }

    // Completion view buttons (legacy and new)
    document.getElementById('view-progress-btn')?.addEventListener('click', () => {
        switchView('progress-view');
    });

    document.getElementById('back-home-btn')?.addEventListener('click', () => {
        switchView(getTodaySchedule().type === 'rest' ? 'rest-day-view' : 'workout-view');
    });

    const completionViewProgressBtn = document.getElementById('completion-view-progress-btn');
    if (completionViewProgressBtn) {
        completionViewProgressBtn.addEventListener('click', () => {
            switchView('progress-view');
        });
    }

    const completionLogMealsBtn = document.getElementById('completion-log-meals-btn');
    if (completionLogMealsBtn) {
        completionLogMealsBtn.addEventListener('click', () => {
            switchView('workout-view');
            // Scroll to meal calculator
            setTimeout(() => {
                document.getElementById('meal-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }

    // Rest day view buttons
    const restViewProgressBtn = document.getElementById('rest-view-progress-btn');
    if (restViewProgressBtn) {
        restViewProgressBtn.addEventListener('click', () => {
            switchView('progress-view');
        });
    }

    const restChecklistBtn = document.getElementById('rest-checklist-btn');
    if (restChecklistBtn) {
        restChecklistBtn.addEventListener('click', () => {
            // Expand checklist if collapsed
            const checklistContent = document.getElementById('checklist-content');
            if (checklistContent && !checklistContent.classList.contains('expanded')) {
                toggleRecoveryChecklist();
            }
        });
    }

    const restMealTrackerBtn = document.getElementById('rest-meal-tracker-btn');
    if (restMealTrackerBtn) {
        restMealTrackerBtn.addEventListener('click', () => {
            switchView('workout-view');
            // Scroll to meal calculator
            setTimeout(() => {
                document.getElementById('meal-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }

    // Recovery checklist toggle (only exists in rest-day-view)
    const checklistToggle = document.getElementById('checklist-toggle');
    if (checklistToggle) {
        checklistToggle.addEventListener('click', toggleRecoveryChecklist);
    }

    // Recovery checkboxes (only exist in rest-day-view)
    const recoveryCheckboxes = document.querySelectorAll('.recovery-checkbox');
    if (recoveryCheckboxes.length > 0) {
        recoveryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });
    }

    // Meal calculator
    const calculateNutritionBtn = document.getElementById('calculate-nutrition-btn');
    if (calculateNutritionBtn) {
        calculateNutritionBtn.addEventListener('click', calculateNutrition);
    }

    const addMealBtn = document.getElementById('add-meal-btn');
    if (addMealBtn) {
        addMealBtn.addEventListener('click', addMealToLog);
    }

    const clearMealsBtn = document.getElementById('clear-meals-btn');
    if (clearMealsBtn) {
        clearMealsBtn.addEventListener('click', clearMealLog);
    }

    // Water tracking buttons
    const waterIncrementBtn = document.getElementById('water-increment-btn');
    if (waterIncrementBtn) {
        waterIncrementBtn.addEventListener('click', incrementWater);
    }

    const waterDecrementBtn = document.getElementById('water-decrement-btn');
    if (waterDecrementBtn) {
        waterDecrementBtn.addEventListener('click', decrementWater);
    }

    const restWaterIncrementBtn = document.getElementById('rest-water-increment-btn');
    if (restWaterIncrementBtn) {
        restWaterIncrementBtn.addEventListener('click', incrementWater);
    }

    const restWaterDecrementBtn = document.getElementById('rest-water-decrement-btn');
    if (restWaterDecrementBtn) {
        restWaterDecrementBtn.addEventListener('click', decrementWater);
    }

    // Water glass click handlers (clickable glasses)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('water-glass') || e.target.classList.contains('rest-water-glass')) {
            const index = parseInt(e.target.dataset.index);
            if (index < todayData.waterIntake) {
                // Clicking a filled glass decrements
                decrementWater();
            } else if (index === todayData.waterIntake) {
                // Clicking the next empty glass increments
                incrementWater();
            }
        }
    });
}

function getTodaySchedule() {
    const today = new Date().getDay();
    return WORKOUT_SCHEDULE[today];
}

// ===========================
// REST TIMER FUNCTIONS
// ===========================

function setTimerDuration(duration) {
    timerDuration = duration;
    // Save to localStorage for persistence
    localStorage.setItem('timerDuration', duration.toString());

    // If currently on this exercise, reset to new duration
    if (restTimerExerciseIndex !== null) {
        restTimerRemaining = duration;
        updateTimerDisplay(restTimerExerciseIndex);
    }
}

function startRestTimer(exerciseIndex, duration = null) {
    // If timer is already running for a different exercise, reset it
    if (restTimerActive && restTimerExerciseIndex !== exerciseIndex) {
        resetRestTimer(restTimerExerciseIndex);
    }

    restTimerExerciseIndex = exerciseIndex;

    // Use provided duration or current timerDuration setting
    const useDuration = duration || timerDuration;

    // If paused, resume. Otherwise start fresh
    if (!restTimerActive) {
        restTimerRemaining = useDuration;
    }

    restTimerActive = true;
    updateTimerDisplay(exerciseIndex);

    // Clear any existing interval
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
    }

    // Start countdown
    restTimerInterval = setInterval(() => {
        restTimerRemaining--;
        updateTimerDisplay(exerciseIndex);

        if (restTimerRemaining <= 0) {
            completeRestTimer(exerciseIndex);
        }
    }, 1000);
}

function pauseRestTimer(exerciseIndex) {
    restTimerActive = false;
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    updateTimerDisplay(exerciseIndex);
}

function resetRestTimer(exerciseIndex) {
    restTimerActive = false;
    restTimerRemaining = timerDuration;
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    restTimerExerciseIndex = null;
    updateTimerDisplay(exerciseIndex);
}

function completeRestTimer(exerciseIndex) {
    restTimerActive = false;
    restTimerRemaining = 0;
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }

    updateTimerDisplay(exerciseIndex);

    // Play sound notification
    playTimerSound();

    // Vibrate if supported
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    }

    // Show visual notification
    const timerEl = document.querySelector(`[data-timer-index="${exerciseIndex}"]`);
    if (timerEl) {
        timerEl.classList.add('timer-complete');
        setTimeout(() => {
            timerEl.classList.remove('timer-complete');
            resetRestTimer(exerciseIndex);
        }, 3000);
    }
}

function updateTimerDisplay(exerciseIndex) {
    const timerEl = document.querySelector(`[data-timer-index="${exerciseIndex}"]`);
    if (!timerEl) return;

    const minutes = Math.floor(restTimerRemaining / 60);
    const seconds = restTimerRemaining % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const timeDisplay = timerEl.querySelector('.timer-time');
    const startBtn = timerEl.querySelector('.timer-start');
    const pauseBtn = timerEl.querySelector('.timer-pause');
    const resetBtn = timerEl.querySelector('.timer-reset');
    const progressCircle = timerEl.querySelector('.timer-progress-circle');

    if (timeDisplay) timeDisplay.textContent = timeStr;

    // Update button visibility
    if (startBtn && pauseBtn) {
        if (restTimerActive && restTimerExerciseIndex === exerciseIndex) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-flex';
        } else {
            startBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
        }
    }

    // Update progress circle using current timerDuration
    if (progressCircle) {
        const progress = (restTimerRemaining / timerDuration) * 100;
        progressCircle.style.setProperty('--progress', `${progress}%`);
    }

    // Update duration selector active states
    const durationBtns = timerEl.querySelectorAll('.timer-duration-btn');
    durationBtns.forEach(btn => {
        const btnDuration = parseInt(btn.dataset.duration);
        if (btnDuration === timerDuration) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function playTimerSound() {
    // Create audio context for beep sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // Hz
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// ===========================
// WATER INTAKE FUNCTIONS
// ===========================

function incrementWater() {
    if (todayData.waterIntake < USER_PROFILE.goals.water) {
        todayData.waterIntake++;
    } else {
        // Allow going over goal
        todayData.waterIntake++;
    }
    saveTodayData();
    updateWaterDisplay();

    // Add celebrat animation if goal reached
    if (todayData.waterIntake === USER_PROFILE.goals.water) {
        celebrateWaterGoal();
    }
}

function decrementWater() {
    if (todayData.waterIntake > 0) {
        todayData.waterIntake--;
        saveTodayData();
        updateWaterDisplay();
    }
}

function updateWaterDisplay() {
    // Update in workout view
    const waterCount = document.getElementById('water-count');
    const waterProgress = document.getElementById('water-progress-fill');
    const waterGlasses = document.querySelectorAll('.water-glass');

    if (waterCount) {
        waterCount.textContent = `${todayData.waterIntake}/${USER_PROFILE.goals.water}`;
    }

    if (waterProgress) {
        const percentage = (todayData.waterIntake / USER_PROFILE.goals.water) * 100;
        waterProgress.style.width = `${Math.min(percentage, 100)}%`;
    }

    // Update glass icons
    waterGlasses.forEach((glass, index) => {
        if (index < todayData.waterIntake) {
            glass.classList.add('filled');
        } else {
            glass.classList.remove('filled');
        }
    });

    // Update in rest day view if it exists
    const restWaterCount = document.getElementById('rest-water-count');
    const restWaterProgress = document.getElementById('rest-water-progress-fill');
    const restWaterGlasses = document.querySelectorAll('.rest-water-glass');

    if (restWaterCount) {
        restWaterCount.textContent = `${todayData.waterIntake}/${USER_PROFILE.goals.water}`;
    }

    if (restWaterProgress) {
        const percentage = (todayData.waterIntake / USER_PROFILE.goals.water) * 100;
        restWaterProgress.style.width = `${Math.min(percentage, 100)}%`;
    }

    restWaterGlasses.forEach((glass, index) => {
        if (index < todayData.waterIntake) {
            glass.classList.add('filled');
        } else {
            glass.classList.remove('filled');
        }
    });
}

function celebrateWaterGoal() {
    const waterCard = document.querySelector('.water-tracker-card');
    if (waterCard) {
        waterCard.classList.add('goal-reached');
        setTimeout(() => {
            waterCard.classList.remove('goal-reached');
        }, 2000);
    }

    // Vibrate if supported
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
    }
}

// ===========================
// MACRO PERCENTAGE VISUALIZATION
// ===========================

function calculateMacroPercentages() {
    const consumed = todayData.nutritionConsumed;

    // Calculate calories from each macro (Protein=4cal/g, Carbs=4cal/g, Fat=9cal/g)
    const proteinCals = consumed.protein * 4;
    const carbsCals = consumed.carbs * 4;
    const fatCals = consumed.fat * 9;
    const totalCals = proteinCals + carbsCals + fatCals;

    if (totalCals === 0) {
        return {
            protein: 0,
            carbs: 0,
            fat: 0,
            totalCals: 0
        };
    }

    return {
        protein: Math.round((proteinCals / totalCals) * 100),
        carbs: Math.round((carbsCals / totalCals) * 100),
        fat: Math.round((fatCals / totalCals) * 100),
        totalCals: Math.round(totalCals)
    };
}

function renderMacroChart(canvasId, percentages) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.6;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Define colors
    const colors = {
        protein: '#3b82f6', // Blue
        carbs: '#10b981',   // Green
        fat: '#f59e0b'      // Orange
    };

    // Calculate angles
    const total = percentages.protein + percentages.carbs + percentages.fat;
    if (total === 0) {
        // Draw empty circle
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = radius - innerRadius;
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius + innerRadius) / 2, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw "No data" text
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No meals', centerX, centerY - 8);
        ctx.fillText('logged', centerX, centerY + 8);
        return;
    }

    let startAngle = -Math.PI / 2; // Start at top

    // Draw arcs for each macro
    ['protein', 'carbs', 'fat'].forEach(macro => {
        const percent = percentages[macro];
        if (percent > 0) {
            const sliceAngle = (percent / 100) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            // Draw arc
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();

            ctx.fillStyle = colors[macro];
            ctx.fill();

            startAngle = endAngle;
        }
    });

    // Draw center circle (donut hole)
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // Draw total calories in center
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentages.totalCals}`, centerX, centerY - 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('cal', centerX, centerY + 12);
}

function updateMacroChart() {
    const percentages = calculateMacroPercentages();
    renderMacroChart('macro-chart-canvas', percentages);

    // Update percentage text
    document.getElementById('protein-percent').textContent = `${percentages.protein}%`;
    document.getElementById('carbs-percent').textContent = `${percentages.carbs}%`;
    document.getElementById('fat-percent').textContent = `${percentages.fat}%`;
}

function loadTodayData() {
    const todayStr = new Date().toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem('fitnessData'));

    todayData = data.logs.find(log => log.date === todayStr);

    if (!todayData) {
        todayData = {
            date: todayStr,
            workoutCompleted: false,
            nutritionConsumed: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
            },
            waterIntake: 0, // glasses of water
            bodyWeight: USER_PROFILE.weight,
            exerciseLogs: []
        };
    }

    // Ensure waterIntake exists for legacy data
    if (todayData.waterIntake === undefined) {
        todayData.waterIntake = 0;
    }
}

function renderCurrentView() {
    const schedule = getTodaySchedule();

    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
        view.style.display = 'none';
    });

    // Check if today's workout is already completed
    if (todayData.workoutCompleted) {
        renderCompletionView();
        document.getElementById('completion-view').style.display = 'block';
        currentView = 'completion-view';
    } else if (schedule.type === 'rest') {
        renderRestDayView();
        document.getElementById('rest-day-view').style.display = 'block';
    } else {
        renderWorkoutView(schedule);
        document.getElementById('workout-view').style.display = 'block';
        currentView = 'workout-view';
    }
}

// ===========================
// WEIGHT SUGGESTIONS
// ===========================

function calculateSuggestedWeight(exerciseName) {
    const data = JSON.parse(localStorage.getItem('fitnessData'));
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    // Get last week's performance (same day of week)
    const lastWeekLog = data.logs.find(log => log.date === lastWeekStr);
    if (lastWeekLog?.exercisePerformance?.[exerciseName]?.weight) {
        const lastWeight = lastWeekLog.exercisePerformance[exerciseName].weight;
        // Suggest 2.5% increase for progressive overload
        const suggested = Math.round(lastWeight * 1.025);
        return {
            suggested,
            last: lastWeight,
            increase: suggested - lastWeight,
            hasHistory: true
        };
    }

    // Fallback: check most recent performance from any day
    const allLogs = data.logs
        .filter(log => log.exercisePerformance?.[exerciseName]?.weight)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allLogs.length > 0) {
        const lastWeight = allLogs[0].exercisePerformance[exerciseName].weight;
        const lastSets = allLogs[0].exercisePerformance[exerciseName].sets;
        const lastReps = allLogs[0].exercisePerformance[exerciseName].reps;
        return {
            suggested: lastWeight,
            last: lastWeight,
            lastSets: lastSets,
            lastReps: lastReps,
            increase: 0,
            hasHistory: true
        };
    }

    return { hasHistory: false }; // No history available
}

function saveExercisePerformance(exerciseName, sets, reps, weight) {
    if (!todayData.exercisePerformance) {
        todayData.exercisePerformance = {};
    }

    todayData.exercisePerformance[exerciseName] = {
        sets: parseInt(sets) || 0,
        reps: parseInt(reps) || 0,
        weight: parseFloat(weight) || null
    };

    saveTodayData();

    // Re-render workout view to update badges
    const schedule = getTodaySchedule();
    if (schedule.type === 'workout') {
        renderWorkoutView(schedule);
    }
}

function renderWorkoutView(schedule) {
    const workout = WORKOUTS[schedule.workoutKey];
    const data = JSON.parse(localStorage.getItem('fitnessData'));

    // Format current date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // Update header with date and streak
    const header = document.querySelector('#workout-view .view-header');
    header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
            <div>
                <div style="font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 4px;">${dateStr}</div>
                <h2 style="margin: 0;">${workout.name}</h2>
            </div>
            <div style="text-align: right;">
                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--primary-light);">${data.streak}</div>
                <div style="font-size: var(--font-size-sm); color: var(--text-muted);">Day Streak 🔥</div>
            </div>
        </div>
        <p class="subtitle">${workout.exercises.length} exercises</p>
    `;

    // Get last week's data for this workout (7 days ago, same day of week)
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
    const lastWeekLog = data.logs.find(log => log.date === lastWeekStr);

    // Render exercises
    const exerciseList = document.getElementById('exercise-list');
    exerciseList.innerHTML = '';

    workout.exercises.forEach((exercise, index) => {
        const isCompleted = todayData.exerciseLogs.includes(index);

        // Get last week's performance if available and calculate improvements
        let lastPerformance = '';
        let improvementBadge = '';

        if (exercise.weight && todayData.exercisePerformance && todayData.exercisePerformance[exercise.name]) {
            const currentPerf = todayData.exercisePerformance[exercise.name];

            // Get last week's data
            if (lastWeekLog && lastWeekLog.exercisePerformance && lastWeekLog.exercisePerformance[exercise.name]) {
                const lastWeekPerf = lastWeekLog.exercisePerformance[exercise.name];

                // Calculate improvement if both have weight data
                if (currentPerf.weight && lastWeekPerf.weight) {
                    const weightIncrease = currentPerf.weight - lastWeekPerf.weight;
                    const percentIncrease = ((weightIncrease / lastWeekPerf.weight) * 100).toFixed(1);

                    if (weightIncrease > 0) {
                        // Determine badge emoji based on weight increase
                        let emoji = '🔥'; // Default for +5-9 lbs
                        if (weightIncrease >= 15) emoji = '🚀'; // +15 lbs or more
                        else if (weightIncrease >= 10) emoji = '⚡'; // +10-14 lbs

                        improvementBadge = ` <span class="improvement-badge">${emoji} +${weightIncrease} lbs (+${percentIncrease}%)</span>`;
                    }
                }

                lastPerformance = ` <span style="color: var(--text-muted); font-size: var(--font-size-sm);">Last: ${lastWeekPerf.sets}x${lastWeekPerf.reps}${lastWeekPerf.weight ? ' @ ' + lastWeekPerf.weight + ' lbs' : ''}</span>`;
            }

            // Check if current performance is a PR (personal record)
            // Compare against ALL previous performances
            const todayStr = new Date().toISOString().split('T')[0];
            const allPreviousPerformances = data.logs
                .filter(log => log.date !== todayStr && log.exercisePerformance && log.exercisePerformance[exercise.name])
                .map(log => log.exercisePerformance[exercise.name].weight)
                .filter(w => w !== null && w !== undefined);

            if (allPreviousPerformances.length > 0) {
                const maxPreviousWeight = Math.max(...allPreviousPerformances);
                if (currentPerf.weight > maxPreviousWeight) {
                    improvementBadge = ` <span class="pr-badge">🏆 NEW PR!</span>`;
                }
            } else if (currentPerf.weight) {
                // First time logging this exercise with weight
                improvementBadge = ` <span class="pr-badge">🏆 NEW PR!</span>`;
            }
        } else if (lastWeekLog && lastWeekLog.exercisePerformance && lastWeekLog.exercisePerformance[exercise.name]) {
            // Just show last week's performance if no current data
            const perf = lastWeekLog.exercisePerformance[exercise.name];
            lastPerformance = ` <span style="color: var(--text-muted); font-size: var(--font-size-sm);">Last: ${perf.sets}x${perf.reps}${perf.weight ? ' @ ' + perf.weight + ' lbs' : ''}</span>`;
        }

        const exerciseDiv = document.createElement('div');
        exerciseDiv.className = `exercise-item ${isCompleted ? 'completed' : ''}`;

        // Get weight suggestion for this exercise
        let weightInputs = '';
        if (exercise.weight) {
            const suggestion = calculateSuggestedWeight(exercise.name);
            const currentPerf = todayData.exercisePerformance?.[exercise.name];

            let suggestionText = '';
            if (suggestion.hasHistory) {
                if (suggestion.increase > 0) {
                    suggestionText = `<div class="weight-suggestion">Suggested: <span class="weight-suggestion-highlight">${suggestion.suggested} lbs</span> (last: ${suggestion.last} lbs, +${suggestion.increase} lbs)</div>`;
                } else {
                    suggestionText = `<div class="weight-suggestion">Last workout: <span class="weight-suggestion-highlight">${suggestion.last} lbs</span> @ ${suggestion.lastSets}x${suggestion.lastReps}</div>`;
                }
            }

            weightInputs = `
                <div class="weight-inputs">
                    <div class="weight-input-group">
                        <label class="weight-input-label">Sets</label>
                        <div class="weight-display">${exercise.sets}</div>
                    </div>
                    <div class="weight-input-group">
                        <label class="weight-input-label">Reps</label>
                        <div class="weight-display">${exercise.reps}</div>
                    </div>
                    <div class="weight-input-group">
                        <label class="weight-input-label">Weight (lbs)</label>
                        <input type="number" 
                               class="weight-input" 
                               data-field="weight"
                               value="${currentPerf?.weight || suggestion.suggested || ''}" 
                               min="0" 
                               step="2.5"
                               placeholder="${suggestion.suggested || '0'}">
                        ${suggestionText}
                    </div>
                </div>
            `;
        }

        exerciseDiv.innerHTML = `
            <div class="exercise-header">
                <div class="exercise-name">${exercise.name}${improvementBadge}${lastPerformance}</div>
                <input type="checkbox" 
                       class="exercise-checkbox" 
                       data-index="${index}"
                       ${isCompleted ? 'checked' : ''}>
            </div>
            <div class="exercise-details">${exercise.sets} sets × ${exercise.reps} reps</div>
            ${exercise.notes ? `<div class="exercise-notes">${exercise.notes}</div>` : ''}
            ${weightInputs}
            ${exercise.weight ? `
                <div class="rest-timer" data-timer-index="${index}">
                    <div class="timer-header">
                        <span class="timer-label">⏱️ Rest Timer</span>
                        <span class="timer-time">1:15</span>
                    </div>
                    <div class="timer-duration-selector">
                        <button class="timer-duration-btn ${timerDuration === 60 ? 'active' : ''}" data-duration="60">1:00</button>
                        <button class="timer-duration-btn ${timerDuration === 75 ? 'active' : ''}" data-duration="75">1:15</button>
                        <button class="timer-duration-btn ${timerDuration === 120 ? 'active' : ''}" data-duration="120">2:00</button>
                    </div>
                    <div class="timer-progress">
                        <div class="timer-progress-circle" style="--progress: 100%"></div>
                    </div>
                    <div class="timer-controls">
                        <button class="timer-btn timer-start" data-action="start">Start</button>
                        <button class="timer-btn timer-pause" data-action="pause" style="display: none;">Pause</button>
                        <button class="timer-btn timer-reset" data-action="reset">Reset</button>
                    </div>
                </div>
            ` : ''}
        `;

        // Add checkbox listener
        const checkbox = exerciseDiv.querySelector('.exercise-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Save weight performance when checking off exercise
                if (exercise.weight) {
                    const weightInput = exerciseDiv.querySelector('.weight-input');
                    const weight = weightInput?.value || null;

                    // Use exercise defaults for sets/reps (not editable)
                    saveExercisePerformance(exercise.name, exercise.sets, exercise.reps, weight);
                }

                if (!todayData.exerciseLogs.includes(index)) {
                    todayData.exerciseLogs.push(index);
                    saveTodayData();
                }
                exerciseDiv.classList.add('completed');
            } else {
                const logIndex = todayData.exerciseLogs.indexOf(index);
                if (logIndex > -1) {
                    todayData.exerciseLogs.splice(logIndex, 1);
                    saveTodayData();
                }
                exerciseDiv.classList.remove('completed');
            }
        });

        // Add weight input listeners (save on blur)
        if (exercise.weight) {
            const weightInput = exerciseDiv.querySelector('.weight-input');
            if (weightInput) {
                weightInput.addEventListener('blur', () => {
                    const weight = weightInput.value || null;
                    // Use exercise defaults for sets/reps
                    saveExercisePerformance(exercise.name, exercise.sets, exercise.reps, weight);
                });

                // Also save on Enter key
                weightInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        weightInput.blur();
                    }
                });
            }
        }

        // Add timer control listeners if this exercise has a timer
        if (exercise.weight) {
            const timerBtns = exerciseDiv.querySelectorAll('.timer-btn');
            timerBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    if (action === 'start') {
                        startRestTimer(index);
                    } else if (action === 'pause') {
                        pauseRestTimer(index);
                    } else if (action === 'reset') {
                        resetRestTimer(index);
                    }
                });
            });

            // Add duration selector listeners
            const durationBtns = exerciseDiv.querySelectorAll('.timer-duration-btn');
            durationBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const duration = parseInt(btn.dataset.duration);
                    setTimerDuration(duration);

                    // If timer is not active, reset to new duration
                    if (!restTimerActive || restTimerExerciseIndex !== index) {
                        resetRestTimer(index);
                    }
                });
            });
        }

        exerciseList.appendChild(exerciseDiv);
    });

    // Load saved nutrition data
    document.getElementById('calories-input').value = todayData.nutritionConsumed.calories || '';
    document.getElementById('protein-input').value = todayData.nutritionConsumed.protein || '';
    document.getElementById('carbs-input').value = todayData.nutritionConsumed.carbs || '';
    document.getElementById('fat-input').value = todayData.nutritionConsumed.fat || '';
    document.getElementById('weight-input').value = todayData.bodyWeight || USER_PROFILE.weight;

    // Update remaining macros display
    updateRemainingMacros();

    // Update water tracker display
    updateWaterDisplay();

    // Update macro percentage chart
    updateMacroChart();

    // Render meal history
    renderMealHistory();
}

function renderRestDayView() {
    const data = JSON.parse(localStorage.getItem('fitnessData'));
    const today = new Date();

    // Update streak
    document.getElementById('rest-streak-display').textContent = data.streak;

    // Calculate and display weekly progress
    const thisWeekWorkouts = calculateThisWeekWorkouts(data);
    const weeklyPercentage = (thisWeekWorkouts / 5) * 100;
    document.getElementById('weekly-workouts').textContent = `${thisWeekWorkouts}/5 Workouts`;
    document.getElementById('weekly-progress-fill').style.width = `${weeklyPercentage}%`;

    // Rotating recovery tips
    const tips = [
        "💧 Drink 8-10 glasses of water today",
        "😴 Aim for 7-9 hours of quality sleep tonight",
        "🧘 Try 10 minutes of stretching or yoga",
        "🥗 Focus on protein-rich meals for recovery",
        "🚶 Take a leisurely 20-minute walk",
        "📱 Limit screen time before bed",
        "🧊 Consider an ice bath or cold shower",
        "📖 Practice mindfulness or meditation"
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const tipElements = randomTip.split(' ');
    document.querySelector('.tip-icon').textContent = tipElements[0];
    document.querySelector('.tip-text').textContent = tipElements.slice(1).join(' ');

    // Calculate next workout
    const nextWorkoutInfo = getNextWorkout(today);
    if (nextWorkoutInfo) {
        document.getElementById('next-workout-name').textContent = nextWorkoutInfo.name;
        document.getElementById('next-workout-time').textContent = nextWorkoutInfo.timeUntil;
    }

    // Update water tracker display
    updateWaterDisplay();
}

function getNextWorkout(currentDate) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = currentDate.getDay();

    // Find next workout day
    for (let i = 1; i <= 7; i++) {
        const nextDay = (currentDay + i) % 7;
        const schedule = WORKOUT_SCHEDULE[nextDay];

        if (schedule.type === 'workout') {
            const hoursUntil = i * 24 - currentDate.getHours();
            const timeText = hoursUntil >= 24
                ? `in ${Math.floor(hoursUntil / 24)} days`
                : `in ${hoursUntil} hours`;

            return {
                name: schedule.name,
                timeUntil: timeText,
                day: daysOfWeek[nextDay]
            };
        }
    }

    return null;
}

// ===========================
// WEEKLY NUTRITION SUMMARY
// ===========================

function calculateWeeklyNutritionAverages(data) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Get all logs from this week
    const weekLogs = data.logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startOfWeek && logDate < endOfWeek;
    });

    if (weekLogs.length === 0) {
        return {
            averages: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
            },
            adherence: 0,
            daysLogged: 0,
            trends: {
                calories: '→',
                protein: '→',
                carbs: '→',
                fat: '→'
            }
        };
    }

    // Calculate totals
    const totals = weekLogs.reduce((acc, log) => {
        return {
            calories: acc.calories + (log.nutritionConsumed.calories || 0),
            protein: acc.protein + (log.nutritionConsumed.protein || 0),
            carbs: acc.carbs + (log.nutritionConsumed.carbs || 0),
            fat: acc.fat + (log.nutritionConsumed.fat || 0)
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Calculate averages
    const averages = {
        calories: Math.round(totals.calories / weekLogs.length),
        protein: Math.round(totals.protein / weekLogs.length),
        carbs: Math.round(totals.carbs / weekLogs.length),
        fat: Math.round(totals.fat / weekLogs.length)
    };

    // Calculate adherence (percentage of days meeting goals)
    const goalsMetCount = weekLogs.filter(log => {
        const caloriesClose = Math.abs(log.nutritionConsumed.calories - USER_PROFILE.goals.calories) < 200;
        const proteinMet = log.nutritionConsumed.protein >= USER_PROFILE.goals.protein * 0.9;
        return caloriesClose && proteinMet;
    }).length;

    const adherence = weekLogs.length > 0 ? Math.round((goalsMetCount / weekLogs.length) * 100) : 0;

    // Calculate trends (comparing to goals)
    const trends = {
        calories: averages.calories > USER_PROFILE.goals.calories ? '↑' : averages.calories < USER_PROFILE.goals.calories ? '↓' : '→',
        protein: averages.protein > USER_PROFILE.goals.protein ? '↑' : averages.protein < USER_PROFILE.goals.protein ? '↓' : '→',
        carbs: averages.carbs > USER_PROFILE.goals.carbs ? '↑' : averages.carbs < USER_PROFILE.goals.carbs ? '↓' : '→',
        fat: averages.fat > USER_PROFILE.goals.fat ? '↑' : averages.fat < USER_PROFILE.goals.fat ? '↓' : '→'
    };

    return {
        averages,
        adherence,
        daysLogged: weekLogs.length,
        trends
    };
}

function renderCompletionView() {
    const data = JSON.parse(localStorage.getItem('fitnessData'));

    //Determine if streak increased or broke
    const streakIncreased = data.streak > 1;

    // Update header text conditionally
    const header = document.getElementById('completion-header');
    const subtext = document.getElementById('completion-subtext');

    if (todayData.workoutCompleted) {
        header.textContent = 'Workout Complete! 💪';
        subtext.textContent = 'Amazing work today! You\'re one step closer to your goals.';
    } else {
        header.textContent = 'Welcome Back, Champion! ✅';
        subtext.textContent = 'Consistency is key. Keep building that momentum!';
    }

    // Animate streak number (count up effect)
    animateStreakNumber(data.streak);

    // Update streak label
    const label = document.getElementById('completion-streak-label');
    if (data.streak > 1) {
        label.textContent = `Day Streak! Keep it going! 🔥`;
    } else if (data.streak === 1) {
        label.textContent = `Starting fresh today. You've got this! 💯`;
    } else {
        label.textContent = `Day Streak 🔥`;
    }

    // Calculate this week's workouts
    const thisWeekWorkouts = calculateThisWeekWorkouts(data);
    document.getElementById('week-workouts').textContent = `${thisWeekWorkouts}/5`;

    // Trigger confetti animation
    createConfetti();
}

function animateStreakNumber(targetStreak) {
    const streakEl = document.getElementById('completion-streak-number');
    const duration = 1000; // 1 second
    const steps = 30;
    const increment = targetStreak / steps;
    let current = 0;

    const interval = setInterval(() => {
        current += increment;
        if (current >= targetStreak) {
            streakEl.textContent = targetStreak;
            clearInterval(interval);
        } else {
            streakEl.textContent = Math.floor(current);
        }
    }, duration / steps);
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = ''; // Clear previous confetti

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#818cf8'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }

    // Remove confetti after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

function calculateThisWeekWorkouts(data) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    return data.logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startOfWeek && log.workoutCompleted;
    }).length;
}

function renderProgressView() {
    const data = JSON.parse(localStorage.getItem('fitnessData'));

    // Update summary stats
    document.getElementById('progress-streak').textContent = data.streak;
    document.getElementById('total-workouts').textContent =
        data.logs.filter(log => log.workoutCompleted).length;

    // Render weekly nutrition summary
    renderWeeklyNutritionSummary(data);

    // Render nutrition countdown
    renderRemainingNutrients();

    // Render 30-day calendar
    renderProgressGrid(data);

    // Setup metric form
    setupMetricForm();

    // Render weight chart
    renderWeightChart(data);
}

function renderWeeklyNutritionSummary(data) {
    const weeklyStats = calculateWeeklyNutritionAverages(data);
    const summaryDiv = document.getElementById('weekly-nutrition-summary');

    if (!summaryDiv) return;

    const { averages, adherence, daysLogged, trends } = weeklyStats;

    summaryDiv.innerHTML = `
        <div class="weekly-header">
            <h4>This Week's Nutrition</h4>
            <span class="days-logged">${daysLogged} days logged</span>
        </div>
        
        <div class="adherence-display">
            <div class="adherence-circle" style="--adherence: ${adherence}%">
                <span class="adherence-percent">${adherence}%</span>
            </div>
            <span class="adherence-label">Goal Adherence</span>
        </div>
        
        <div class="weekly-macros-grid">
            <div class="weekly-macro-item">
                <div class="macro-header">
                    <span class="macro-name">Calories</span>
                    <span class="macro-trend ${trends.calories === '↑' ? 'trend-up' : trends.calories === '↓' ? 'trend-down' : 'trend-same'}">${trends.calories}</span>
                </div>
                <div class="macro-value">${averages.calories}</div>
                <div class="macro-goal">Goal: ${USER_PROFILE.goals.calories}</div>
                <div class="macro-diff ${averages.calories > USER_PROFILE.goals.calories ? 'over' : 'under'}">
                    ${averages.calories > USER_PROFILE.goals.calories ? '+' : ''}${averages.calories - USER_PROFILE.goals.calories}
                </div>
            </div>
            
            <div class="weekly-macro-item">
                <div class="macro-header">
                    <span class="macro-name">Protein</span>
                    <span class="macro-trend ${trends.protein === '↑' ? 'trend-up' : trends.protein === '↓' ? 'trend-down' : 'trend-same'}">${trends.protein}</span>
                </div>
                <div class="macro-value">${averages.protein}g</div>
                <div class="macro-goal">Goal: ${USER_PROFILE.goals.protein}g</div>
                <div class="macro-diff ${averages.protein > USER_PROFILE.goals.protein ? 'over' : 'under'}">
                    ${averages.protein > USER_PROFILE.goals.protein ? '+' : ''}${averages.protein - USER_PROFILE.goals.protein}g
                </div>
            </div>
            
            <div class="weekly-macro-item">
                <div class="macro-header">
                    <span class="macro-name">Carbs</span>
                    <span class="macro-trend ${trends.carbs === '↑' ? 'trend-up' : trends.carbs === '↓' ? 'trend-down' : 'trend-same'}">${trends.carbs}</span>
                </div>
                <div class="macro-value">${averages.carbs}g</div>
                <div class="macro-goal">Goal: ${USER_PROFILE.goals.carbs}g</div>
                <div class="macro-diff ${averages.carbs > USER_PROFILE.goals.carbs ? 'over' : 'under'}">
                    ${averages.carbs > USER_PROFILE.goals.carbs ? '+' : ''}${averages.carbs - USER_PROFILE.goals.carbs}g
                </div>
            </div>
            
            <div class="weekly-macro-item">
                <div class="macro-header">
                    <span class="macro-name">Fat</span>
                    <span class="macro-trend ${trends.fat === '↑' ? 'trend-up' : trends.fat === '↓' ? 'trend-down' : 'trend-same'}">${trends.fat}</span>
                </div>
                <div class="macro-value">${averages.fat}g</div>
                <div class="macro-goal">Goal: ${USER_PROFILE.goals.fat}g</div>
                <div class="macro-diff ${averages.fat > USER_PROFILE.goals.fat ? 'over' : 'under'}">
                    ${averages.fat > USER_PROFILE.goals.fat ? '+' : ''}${averages.fat - USER_PROFILE.goals.fat}g
                </div>
            </div>
        </div>
    `;
}

function renderRemainingNutrients() {
    const remainingDiv = document.getElementById('nutrition-remaining');

    const remaining = {
        calories: USER_PROFILE.goals.calories - todayData.nutritionConsumed.calories,
        protein: USER_PROFILE.goals.protein - todayData.nutritionConsumed.protein,
        carbs: USER_PROFILE.goals.carbs - todayData.nutritionConsumed.carbs,
        fat: USER_PROFILE.goals.fat - todayData.nutritionConsumed.fat
    };

    // Calculate percentage consumed
    const caloriesPercent = (todayData.nutritionConsumed.calories / USER_PROFILE.goals.calories) * 100;

    // Determine color class
    let colorClass = 'on-track';
    if (caloriesPercent >= 100) {
        colorClass = 'over';
    } else if (caloriesPercent >= 80) {
        colorClass = 'warning';
    }

    remainingDiv.className = `remaining-display ${colorClass}`;
    remainingDiv.innerHTML = `
        <div>Remaining Today:</div>
        <div style="margin-top: var(--spacing-sm);">
            ${remaining.calories} cal | ${remaining.protein}g protein | ${remaining.carbs}g carbs | ${remaining.fat}g fat
        </div>
    `;
}

function renderProgressGrid(data) {
    const grid = document.getElementById('thirty-day-calendar');
    grid.innerHTML = '';

    const today = new Date();

    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        const dayNum = date.getDate();

        const log = data.logs.find(l => l.date === dateStr);
        const schedule = WORKOUT_SCHEDULE[dayOfWeek];

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        // Determine status
        const isFuture = date > today;
        if (isFuture) {
            dayCell.classList.add('future');
        } else if (schedule.type === 'rest') {
            dayCell.classList.add('rest');
        } else if (log && log.workoutCompleted) {
            dayCell.classList.add('completed');
        } else {
            dayCell.classList.add('missed');
        }

        dayCell.textContent = dayNum;
        dayCell.title = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        grid.appendChild(dayCell);
    }
}

function calculateStreak() {
    // This function is already implemented as updateStreak()
    // Just call it to ensure streak is updated
    updateStreak();
}

function setupMetricForm() {
    const data = JSON.parse(localStorage.getItem('fitnessData'));

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('metric-date').value = today;

    // Populate exercise dropdown with today's workout
    const schedule = getTodaySchedule();
    populateExerciseSelect(schedule);

    // Setup unit toggle listeners
    const unitButtons = document.querySelectorAll('.unit-btn');
    unitButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            unitButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Setup save metrics button
    const saveBtn = document.getElementById('save-metrics-btn');
    saveBtn.removeEventListener('click', saveMetricLog); // Remove old listener
    saveBtn.addEventListener('click', saveMetricLog);

    // Setup add performance button
    const addPerfBtn = document.getElementById('add-performance-btn');
    addPerfBtn.removeEventListener('click', addPerformanceLog); // Remove old listener
    addPerfBtn.addEventListener('click', addPerformanceLog);
}

function populateExerciseSelect(schedule) {
    const select = document.getElementById('exercise-select');
    select.innerHTML = '<option value="">Select exercise...</option>';

    if (schedule.type !== 'rest' && schedule.workoutKey) {
        const workout = WORKOUTS[schedule.workoutKey];
        workout.exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = exercise.name;
            select.appendChild(option);
        });
    }
}

function addPerformanceLog() {
    const exerciseName = document.getElementById('exercise-select').value;
    const sets = document.getElementById('perf-sets').value;
    const reps = document.getElementById('perf-reps').value;
    const weight = document.getElementById('perf-weight').value;

    if (!exerciseName || !sets || !reps) {
        alert('Please fill in exercise, sets, and reps');
        return;
    }

    // Initialize exercisePerformance if doesn't exist
    if (!todayData.exercisePerformance) {
        todayData.exercisePerformance = {};
    }

    // Save the performance
    todayData.exercisePerformance[exerciseName] = {
        sets: parseInt(sets),
        reps: reps,
        weight: weight ? parseFloat(weight) : null,
        date: new Date().toISOString()
    };

    saveTodayData();

    // Clear fields
    document.getElementById('exercise-select').value = '';
    document.getElementById('perf-sets').value = '';
    document.getElementById('perf-reps').value = '';
    document.getElementById('perf-weight').value = '';

    alert(`Logged ${exerciseName}: ${sets}x${reps}${weight ? ' @ ' + weight + ' lbs' : ''}`);
}

// ===========================
// RECOVERY CHECKLIST FUNCTIONS
// ===========================

function toggleRecoveryChecklist() {
    const content = document.getElementById('checklist-content');
    const toggle = document.getElementById('checklist-toggle');
    const isExpanded = content.style.display !== 'none';

    if (isExpanded) {
        content.classList.remove('expanded');
        content.style.display = 'none';
        toggle.setAttribute('aria-expanded', 'false');
    } else {
        content.style.display = 'block';
        setTimeout(() => content.classList.add('expanded'), 10);
        toggle.setAttribute('aria-expanded', 'true');
        // Load checklist state
        loadRecoveryChecklist();
    }
}

function loadRecoveryChecklist() {
    const today = new Date().toDateString();
    const checklistData = JSON.parse(localStorage.getItem('recoveryChecklist')) || {};

    // Check if we need to reset (new day)
    if (checklistData.date !== today) {
        // Save yesterday's perfect recovery if it was perfect
        if (checklistData.checklist && checklistData.checklist.every(item => item === true)) {
            savePerfectRecoveryDay(checklistData.date);
        }

        // Reset for new day
        checklistData.date = today;
        checklistData.checklist = [false, false, false, false, false, false];
        localStorage.setItem('recoveryChecklist', JSON.stringify(checklistData));
    }

    // Apply saved state to checkboxes
    const checkboxes = document.querySelectorAll('.recovery-checkbox');
    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = checklistData.checklist[index] || false;
    });

    updateChecklistProgress();
}

function handleCheckboxChange(event) {
    const index = parseInt(event.target.dataset.index);
    const isChecked = event.target.checked;

    // Get current checklist data
    const today = new Date().toDateString();
    const checklistData = JSON.parse(localStorage.getItem('recoveryChecklist')) || {
        date: today,
        checklist: [false, false, false, false, false, false]
    };

    // Update the specific checkbox
    checklistData.checklist[index] = isChecked;

    // Save to localStorage
    localStorage.setItem('recoveryChecklist', JSON.stringify(checklistData));

    // Update UI
    updateChecklistProgress();

    // Check if all items are completed
    if (checklistData.checklist.every(item => item === true)) {
        showPerfectRecoveryBadge();
    } else {
        document.getElementById('perfect-recovery-badge').style.display = 'none';
    }
}

function updateChecklistProgress() {
    const checkboxes = document.querySelectorAll('.recovery-checkbox:checked');
    const completed = checkboxes.length;
    const total = 6;
    const percentage = (completed / total) * 100;

    // Update progress text
    document.getElementById('checklist-progress').textContent = `${completed}/${total}`;

    // Update progress bar
    document.getElementById('checklist-progress-fill').style.width = `${percentage}%`;
}

function showPerfectRecoveryBadge() {
    const badge = document.getElementById('perfect-recovery-badge');
    badge.style.display = 'block';

    // Update count
    const count = getPerfectRecoveryCount();
    document.getElementById('perfect-recovery-count').textContent =
        `You've had ${count} perfect recovery day${count !== 1 ? 's' : ''} this month`;

    // Create confetti effect
    createConfetti();
}

function savePerfectRecoveryDay(dateString) {
    const perfectDays = JSON.parse(localStorage.getItem('perfectRecoveryDays')) || [];

    // Add this date if not already recorded
    if (!perfectDays.includes(dateString)) {
        perfectDays.push(dateString);
        localStorage.setItem('perfectRecoveryDays', JSON.stringify(perfectDays));
    }
}

function getPerfectRecoveryCount() {
    const perfectDays = JSON.parse(localStorage.getItem('perfectRecoveryDays')) || [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Count only this month's perfect days
    return perfectDays.filter(dateString => {
        const date = new Date(dateString);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length + 1; // +1 for today
}

// Auto-reset checklist at midnight
function scheduleChecklistReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilMidnight = tomorrow - now;

    setTimeout(() => {
        // Reset checklist
        loadRecoveryChecklist();
        // Schedule next reset
        scheduleChecklistReset();
    }, timeUntilMidnight);
}

// Initialize checklist reset scheduler on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleChecklistReset);
} else {
    scheduleChecklistReset();
}

function saveMetricLog() {
    const date = document.getElementById('metric-date').value;
    const weight = parseFloat(document.getElementById('metric-weight').value);
    const unit = document.querySelector('.unit-btn.active').dataset.unit;

    if (!date) {
        alert('Please select a date');
        return;
    }

    const data = JSON.parse(localStorage.getItem('fitnessData'));
    let log = data.logs.find(l => l.date === Date);

    // If logging for today, use todayData
    const todayStr = new Date().toISOString().split('T')[0];
    if (date === todayStr) {
        if (weight) {
            // Convert kg to lbs if needed
            todayData.bodyWeight = unit === 'kg' ? weight * 2.20462 : weight;
        }
        saveTodayData();
    } else {
        // Create or update log for different date
        log = data.logs.find(l => l.date === date);
        if (!log) {
            log = {
                date: date,
                workoutCompleted: false,
                nutritionConsumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                bodyWeight: USER_PROFILE.weight,
                exerciseLogs: [],
                exercisePerformance: {}
            };
            data.logs.push(log);
        }

        if (weight) {
            log.bodyWeight = unit === 'kg' ? weight * 2.20462 : weight;
        }

        localStorage.setItem('fitnessData', JSON.stringify(data));
    }

    alert('Metrics saved successfully!');

    // Refresh the progress view
    renderProgressView();
}

function renderWeekCalendar(data) {
    const calendar = document.getElementById('week-calendar');
    calendar.innerHTML = '';

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - today.getDay() + i);
        const dateStr = date.toISOString().split('T')[0];

        const log = data.logs.find(l => l.date === dateStr);
        const schedule = WORKOUT_SCHEDULE[i];

        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';

        if (log && log.workoutCompleted) {
            dayCell.classList.add('completed');
        } else if (schedule.type === 'rest') {
            dayCell.classList.add('rest');
        }

        dayCell.innerHTML = `
            <div class="day-name">${days[i]}</div>
            <div class="day-status">${log && log.workoutCompleted ? '✅' : schedule.type === 'rest' ? '💤' : '⭕'}</div>
        `;

        calendar.appendChild(dayCell);
    }
}

function renderHistory(data) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    // Get last 10 logs
    const recentLogs = [...data.logs].reverse().slice(0, 10);

    if (recentLogs.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No activity yet. Start your first workout!</p>';
        return;
    }

    recentLogs.forEach(log => {
        const date = new Date(log.date);
        const dayOfWeek = date.getDay();
        const schedule = WORKOUT_SCHEDULE[dayOfWeek];

        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${schedule.type === 'rest' ? 'rest-day' : ''}`;

        historyItem.innerHTML = `
            <div class="history-date">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div class="history-details">
                ${log.workoutCompleted ? '✅ ' + schedule.name : '💤 Rest Day'}<br>
                🔥 ${log.nutritionConsumed.calories} cal | 💪 ${log.nutritionConsumed.protein}g protein | ⚖️ ${log.bodyWeight} lbs
            </div>
        `;

        historyList.appendChild(historyItem);
    });
}

function renderWeightChart(data) {
    const canvas = document.getElementById('weight-canvas');
    const ctx = canvas.getContext('2d');

    // Get weight data from logs
    const weightData = data.logs
        .filter(log => log.bodyWeight)
        .map(log => ({ date: log.date, weight: log.bodyWeight }))
        .slice(-14); // Last 14 days

    if (weightData.length === 0) {
        ctx.fillStyle = 'var(--text-muted)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No weight data yet', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Simple line chart
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const minWeight = Math.min(...weightData.map(d => d.weight)) - 2;
    const maxWeight = Math.max(...weightData.map(d => d.weight)) + 2;
    const weightRange = maxWeight - minWeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();

    weightData.forEach((point, index) => {
        const x = padding + (index / (weightData.length - 1)) * width;
        const y = canvas.height - padding - ((point.weight - minWeight) / weightRange) * height;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#818cf8';
    weightData.forEach((point, index) => {
        const x = padding + (index / (weightData.length - 1)) * width;
        const y = canvas.height - padding - ((point.weight - minWeight) / weightRange) * height;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxWeight.toFixed(1)} lbs`, padding - 5, padding + 5);
    ctx.fillText(`${minWeight.toFixed(1)} lbs`, padding - 5, canvas.height - padding + 5);
}

function toggleExercise(index, completed) {
    if (completed) {
        if (!todayData.exerciseLogs.includes(index)) {
            todayData.exerciseLogs.push(index);
        }
    } else {
        todayData.exerciseLogs = todayData.exerciseLogs.filter(i => i !== index);
    }
    saveTodayData();
}

function completeWorkout() {
    // Only update nutrition from manual inputs if no meals have been logged
    // (meal logging already updates nutritionConsumed automatically)
    if (!todayData.meals || todayData.meals.length === 0) {
        todayData.nutritionConsumed = {
            calories: parseInt(document.getElementById('calories-input').value) || 0,
            protein: parseInt(document.getElementById('protein-input').value) || 0,
            carbs: parseInt(document.getElementById('carbs-input').value) || 0,
            fat: parseInt(document.getElementById('fat-input').value) || 0
        };
    }
    // If meals were logged, nutritionConsumed is already updated, so don't override it

    todayData.bodyWeight = parseFloat(document.getElementById('weight-input').value) || USER_PROFILE.weight;
    todayData.workoutCompleted = true;

    saveTodayData();
    updateStreak();

    renderCompletionView();
    switchView('completion-view');
}

function logRestDay() {
    // Get nutrition data
    todayData.nutritionConsumed = {
        calories: parseInt(document.getElementById('rest-calories-input').value) || 0,
        protein: parseInt(document.getElementById('rest-protein-input').value) || 0,
        carbs: parseInt(document.getElementById('rest-carbs-input').value) || 0,
        fat: parseInt(document.getElementById('rest-fat-input').value) || 0
    };

    todayData.bodyWeight = parseFloat(document.getElementById('rest-weight-input').value) || USER_PROFILE.weight;
    todayData.workoutCompleted = true; // Rest days count as completed

    saveTodayData();
    updateStreak();

    renderCompletionView();
    switchView('completion-view');
}

function saveTodayData() {
    const data = JSON.parse(localStorage.getItem('fitnessData'));

    const existingIndex = data.logs.findIndex(log => log.date === todayData.date);

    if (existingIndex !== -1) {
        data.logs[existingIndex] = todayData;
    } else {
        data.logs.push(todayData);
    }

    localStorage.setItem('fitnessData', JSON.stringify(data));
}

function updateStreak() {
    const data = JSON.parse(localStorage.getItem('fitnessData'));

    // Sort logs by date
    const sortedLogs = data.logs
        .filter(log => log.workoutCompleted)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedLogs.length === 0) {
        data.streak = 0;
        localStorage.setItem('fitnessData', JSON.stringify(data));
        return;
    }

    // Calculate streak
    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(sortedLogs[0].date);

    for (let i = 1; i < sortedLogs.length; i++) {
        const logDate = new Date(sortedLogs[i].date);
        const dayDiff = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
            streak++;
            currentDate = logDate;
        } else {
            break;
        }
    }

    data.streak = streak;
    localStorage.setItem('fitnessData', JSON.stringify(data));
}

function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
        view.style.display = 'none';
    });

    // Show target view
    const targetView = document.getElementById(viewId);
    targetView.style.display = 'block';
    currentView = viewId;

    // If switching to progress view, render it
    if (viewId === 'progress-view') {
        renderProgressView();
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

// Make canvas responsive
window.addEventListener('resize', () => {
    const canvas = document.getElementById('weight-canvas');
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth - 32; // Account for padding

    if (currentView === 'progress-view') {
        const data = JSON.parse(localStorage.getItem('fitnessData'));
        renderWeightChart(data);
    }
});

// Set initial canvas size
setTimeout(() => {
    const canvas = document.getElementById('weight-canvas');
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth - 32;
    canvas.height = 200;
}, 100);
// ===========================
// MEAL CALCULATOR FUNCTIONS
// ===========================

// Mock API function for testing
function mockFetchNutritionData(query) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Mock response based on common foods
            const mockData = {
                calories: Math.floor(Math.random() * 400) + 250,
                protein: Math.floor(Math.random() * 30) + 20,
                carbs: Math.floor(Math.random() * 50) + 30,
                fat: Math.floor(Math.random() * 20) + 10
            };
            resolve(mockData);
        }, 1500); // Simulate API delay
    });
}

// Real API function using CalorieNinjas
async function fetchNutritionData(query) {
    try {
        const response = await fetch(`${API_URL}?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'X-Api-Key': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // CalorieNinjas returns an array of items
        if (data.items && data.items.length > 0) {
            // Sum up all items
            const totals = data.items.reduce((acc, item) => {
                return {
                    calories: acc.calories + (item.calories || 0),
                    protein: acc.protein + (item.protein_g || 0),
                    carbs: acc.carbs + (item.carbohydrates_total_g || 0),
                    fat: acc.fat + (item.fat_total_g || 0)
                };
            }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

            return {
                calories: Math.round(totals.calories),
                protein: Math.round(totals.protein),
                carbs: Math.round(totals.carbs),
                fat: Math.round(totals.fat)
            };
        } else {
            throw new Error('No nutrition data found');
        }
    } catch (error) {
        console.error('Nutrition API error:', error);
        throw error;
    }
}

// Main function to calculate nutrition
async function calculateNutrition() {
    const mealInput = document.getElementById('meal-input');
    const query = mealInput.value.trim();

    if (!query) {
        alert('Please describe your meal');
        return;
    }

    // Show loading state
    const btnText = document.getElementById('calc-btn-text');
    const spinner = document.getElementById('calc-spinner');
    const calcBtn = document.getElementById('calculate-nutrition-btn');

    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';
    calcBtn.disabled = true;

    try {
        // Use mock or real API based on toggle
        const nutritionData = USE_MOCK_API
            ? await mockFetchNutritionData(query)
            : await fetchNutritionData(query);

        // Store result with meal description
        lastNutritionResult = {
            description: query,
            ...nutritionData
        };

        // Display results
        displayNutritionResults(nutritionData);

        // Show success animation
        const resultsDiv = document.getElementById('nutrition-results');
        resultsDiv.classList.add('success-animation');
        setTimeout(() => resultsDiv.classList.remove('success-animation'), 600);

    } catch (error) {
        alert('Sorry, we couldn\'t calculate nutrition for that meal. Please try rephrasing or check your internet connection.');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
        calcBtn.disabled = false;
    }
}

// Display nutrition results with progress bars
function displayNutritionResults(data) {
    const resultsDiv = document.getElementById('nutrition-results');

    // Update values
    document.getElementById('result-calories').textContent = data.calories;
    document.getElementById('result-protein').textContent = `${data.protein}g`;
    document.getElementById('result-carbs').textContent = `${data.carbs}g`;
    document.getElementById('result-fat').textContent = `${data.fat}g`;

    // Calculate and update progress bars
    const caloriesPercent = Math.min((data.calories / USER_PROFILE.goals.calories) * 100, 100);
    const proteinPercent = Math.min((data.protein / USER_PROFILE.goals.protein) * 100, 100);
    const carbsPercent = Math.min((data.carbs / USER_PROFILE.goals.carbs) * 100, 100);
    const fatPercent = Math.min((data.fat / USER_PROFILE.goals.fat) * 100, 100);

    document.getElementById('progress-calories').style.width = `${caloriesPercent}%`;
    document.getElementById('progress-protein').style.width = `${proteinPercent}%`;
    document.getElementById('progress-carbs').style.width = `${carbsPercent}%`;
    document.getElementById('progress-fat').style.width = `${fatPercent}%`;

    // Show results
    resultsDiv.style.display = 'block';
}

// Add meal to today's log
function addMealToLog() {
    if (!lastNutritionResult) {
        alert('Please calculate nutrition first');
        return;
    }

    // Initialize meals array if it doesn't exist
    if (!todayData.meals) {
        todayData.meals = [];
    }

    // Add meal to history
    todayData.meals.push({
        description: lastNutritionResult.description,
        calories: lastNutritionResult.calories,
        protein: lastNutritionResult.protein,
        carbs: lastNutritionResult.carbs,
        fat: lastNutritionResult.fat,
        timestamp: new Date().toISOString()
    });

    // Update totals
    todayData.nutritionConsumed.calories += lastNutritionResult.calories;
    todayData.nutritionConsumed.protein += lastNutritionResult.protein;
    todayData.nutritionConsumed.carbs += lastNutritionResult.carbs;
    todayData.nutritionConsumed.fat += lastNutritionResult.fat;

    // Save to localStorage
    saveTodayData();

    // Update UI
    updateNutritionInputs();
    renderMealHistory();

    // Clear meal input and hide results
    document.getElementById('meal-input').value = '';
    document.getElementById('nutrition-results').style.display = 'none';
    lastNutritionResult = null;

    // Show success message
    const successMsg = document.createElement('div');
    successMsg.textContent = '✓ Meal added!';
    successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; z-index: 1000; animation: slideIn 0.3s ease;';
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 2000);
}

// Update nutrition inputs to reflect current totals
function updateNutritionInputs() {
    document.getElementById('calories-input').value = todayData.nutritionConsumed.calories;
    document.getElementById('protein-input').value = todayData.nutritionConsumed.protein;
    document.getElementById('carbs-input').value = todayData.nutritionConsumed.carbs;
    document.getElementById('fat-input').value = todayData.nutritionConsumed.fat;

    // Update remaining macros display
    updateRemainingMacros();

    // Update macro percentage chart
    updateMacroChart();
}

// Update the remaining macros display
function updateRemainingMacros() {
    const remaining = {
        calories: USER_PROFILE.goals.calories - todayData.nutritionConsumed.calories,
        protein: USER_PROFILE.goals.protein - todayData.nutritionConsumed.protein,
        carbs: USER_PROFILE.goals.carbs - todayData.nutritionConsumed.carbs,
        fat: USER_PROFILE.goals.fat - todayData.nutritionConsumed.fat
    };

    // Update calories
    const caloriesEl = document.getElementById('remaining-calories');
    caloriesEl.textContent = remaining.calories;
    caloriesEl.className = 'remaining-value';
    if (remaining.calories < 0) {
        caloriesEl.classList.add('over');
    } else if (remaining.calories < 300) {
        caloriesEl.classList.add('warning');
    }

    // Update protein
    const proteinEl = document.getElementById('remaining-protein');
    proteinEl.textContent = remaining.protein + 'g';
    proteinEl.className = 'remaining-value';
    if (remaining.protein < 0) {
        proteinEl.classList.add('over');
    } else if (remaining.protein < 30) {
        proteinEl.classList.add('warning');
    }

    // Update carbs
    const carbsEl = document.getElementById('remaining-carbs');
    carbsEl.textContent = remaining.carbs + 'g';
    carbsEl.className = 'remaining-value';
    if (remaining.carbs < 0) {
        carbsEl.classList.add('over');
    } else if (remaining.carbs < 40) {
        carbsEl.classList.add('warning');
    }

    // Update fat
    const fatEl = document.getElementById('remaining-fat');
    fatEl.textContent = remaining.fat + 'g';
    fatEl.className = 'remaining-value';
    if (remaining.fat < 0) {
        fatEl.classList.add('over');
    } else if (remaining.fat < 15) {
        fatEl.classList.add('warning');
    }
}

// Render meal history
function renderMealHistory() {
    const mealList = document.getElementById('meal-list');

    if (!todayData.meals || todayData.meals.length === 0) {
        mealList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No meals logged yet</p>';
        return;
    }

    mealList.innerHTML = '';
    todayData.meals.forEach((meal, index) => {
        const mealItem = document.createElement('div');
        mealItem.className = 'meal-item';
        mealItem.innerHTML = `
            <div class="meal-description">${meal.description}</div>
            <div class="meal-macros">
                ${meal.calories} cal | ${meal.protein}g protein | ${meal.carbs}g carbs | ${meal.fat}g fat
            </div>
        `;
        mealList.appendChild(mealItem);
    });
}

// Clear meal log
function clearMealLog() {
    if (!confirm('Are you sure you want to clear today\'s meal log?')) {
        return;
    }

    // Reset nutrition totals
    todayData.nutritionConsumed = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
    };

    // Clear meals array
    todayData.meals = [];

    // Save and update UI
    saveTodayData();
    updateNutritionInputs();
    renderMealHistory();
}
