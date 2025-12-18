/* ===========================
   SUPABASE SERVICE LAYER
   All cloud database operations
   =========================== */

// ===========================
// HELPER FUNCTIONS
// ===========================

function isRestDay(dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    // Access rest days from USER_PROFILE if available, otherwise use default
    const restDays = (typeof USER_PROFILE !== 'undefined' && USER_PROFILE.restDays) ? USER_PROFILE.restDays : [0, 4];
    return restDays.includes(dayOfWeek);
}

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

async function signUpWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        // Create initial profile
        if (data.user) {
            await createUserProfile(data.user.id);
        }

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
    }
}

async function signInWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Clear local data
        currentUser = null;

        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// ===========================
// PROFILE FUNCTIONS
// ===========================

async function createUserProfile(userId) {
    try {
        // Create profile with current USER_PROFILE data
        const { error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                age: USER_PROFILE.age,
                height_inches: USER_PROFILE.heightInches,
                weight: USER_PROFILE.weight,
                goals: USER_PROFILE.goals,
                diet: USER_PROFILE.diet,
                rest_days: USER_PROFILE.restDays,
                program_duration: USER_PROFILE.programDuration
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Profile creation error:', error);
        return { success: false, error: error.message };
    }
}

async function loadUserProfile() {
    try {
        // Get current user from session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('No user found');
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        if (data) {
            // Update USER_PROFILE with cloud data
            if (typeof USER_PROFILE !== 'undefined') {
                USER_PROFILE.age = data.age || USER_PROFILE.age;
                USER_PROFILE.heightInches = data.height_inches || USER_PROFILE.heightInches;
                USER_PROFILE.weight = data.weight || USER_PROFILE.weight;
                USER_PROFILE.goals = data.goals || USER_PROFILE.goals;
                USER_PROFILE.diet = data.diet || USER_PROFILE.diet;
                USER_PROFILE.restDays = data.rest_days || USER_PROFILE.restDays;
                USER_PROFILE.programDuration = data.program_duration || USER_PROFILE.programDuration;
            }
        }

        return { success: true, profile: data };
    } catch (error) {
        console.error('Load profile error:', error);
        return { success: false, error: error.message };
    }
}

// ===========================
// WORKOUT FUNCTIONS
// ===========================

async function saveWorkoutToCloud(workoutData) {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
        // Upsert workout
        const { data: workout, error: workoutError } = await supabase
            .from('workouts')
            .upsert({
                user_id: currentUser.id,
                date: workoutData.date,
                workout_type: getTodaySchedule().workoutKey,
                workout_name: getTodaySchedule().name,
                completed: workoutData.workoutCompleted,
                completed_at: workoutData.workoutCompleted ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,date'
            })
            .select()
            .single();

        if (workoutError) throw workoutError;

        // Save exercise performance
        if (workoutData.exercisePerformance) {
            await saveExerciseLogsToCloud(workout.id, workoutData.exercisePerformance);
        }

        // Save nutrition
        await saveNutritionToCloud(workoutData.date, workoutData.nutritionConsumed, workoutData.meals);

        // Save body metrics
        await saveBodyMetricsToCloud(workoutData.date, workoutData.bodyWeight, workoutData.waterIntake);

        return { success: true };
    } catch (error) {
        console.error('Save workout error:', error);
        return { success: false, error: error.message };
    }
}

async function saveExerciseLogsToCloud(workoutId, exercisePerformance) {
    try {
        // Delete existing logs for this workout
        await supabase
            .from('exercise_logs')
            .delete()
            .eq('workout_id', workoutId);

        // Insert new logs
        const logs = [];
        for (const [exerciseName, perf] of Object.entries(exercisePerformance)) {
            logs.push({
                workout_id: workoutId,
                exercise_name: exerciseName,
                set_number: perf.sets || 1,
                reps: perf.reps || 0,
                weight: perf.weight || null,
                created_at: perf.date || new Date().toISOString()
            });
        }

        if (logs.length > 0) {
            const { error } = await supabase
                .from('exercise_logs')
                .insert(logs);

            if (error) throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('Save exercise logs error:', error);
        return { success: false, error: error.message };
    }
}

async function saveNutritionToCloud(date, nutritionConsumed, meals) {
    if (!currentUser) return;

    try {
        // Upsert daily nutrition totals
        const { error: nutritionError } = await supabase
            .from('daily_nutrition')
            .upsert({
                user_id: currentUser.id,
                date: date,
                calories: nutritionConsumed.calories || 0,
                protein: nutritionConsumed.protein || 0,
                carbs: nutritionConsumed.carbs || 0,
                fat: nutritionConsumed.fat || 0,
                water_intake: 0, // Will be updated by body_metrics
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,date'
            });

        if (nutritionError) throw nutritionError;

        // Save individual meals if they exist
        if (meals && meals.length > 0) {
            // Filter out invalid meals (must have a name)
            const validMeals = meals.filter(meal => meal && (meal.name || meal.description));

            if (validMeals.length > 0) {
                // Delete existing meals for this date
                await supabase
                    .from('meals')
                    .delete()
                    .eq('user_id', currentUser.id)
                    .eq('date', date);

                // Insert new meals
                const mealRecords = validMeals.map(meal => ({
                    user_id: currentUser.id,
                    date: date,
                    meal_name: meal.name || meal.description,
                    nutrition: meal.nutrition
                }));

                const { error: mealsError } = await supabase
                    .from('meals')
                    .insert(mealRecords);

                if (mealsError) throw mealsError;
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Save nutrition error:', error);
        return { success: false, error: error.message };
    }
}

async function saveBodyMetricsToCloud(date, bodyWeight, waterIntake) {
    if (!currentUser) return;

    try {
        const { error } = await supabase
            .from('body_metrics')
            .upsert({
                user_id: currentUser.id,
                date: date,
                weight: bodyWeight || null,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,date'
            });

        if (error) throw error;

        // Also update water_intake in daily_nutrition
        await supabase
            .from('daily_nutrition')
            .upsert({
                user_id: currentUser.id,
                date: date,
                water_intake: waterIntake || 0,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,date',
                ignoreDuplicates: false
            });

        return { success: true };
    } catch (error) {
        console.error('Save body metrics error:', error);
        return { success: false, error: error.message };
    }
}

// ===========================
// DATA RETRIEVAL FUNCTIONS
// ===========================

async function getWorkoutHistory(startDate, endDate) {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
        const { data, error } = await supabase
            .from('workouts')
            .select(`
                *,
                exercise_logs (*)
            `)
            .eq('user_id', currentUser.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) throw error;

        return { success: true, workouts: data };
    } catch (error) {
        console.error('Get workout history error:', error);
        return { success: false, error: error.message };
    }
}

// ===========================
// SYNC FUNCTIONS
// ===========================

async function syncCloudToLocal() {
    if (!currentUser) return;

    try {
        // Get last 90 days of data
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Fetch workouts with exercise logs
        const { data: workouts } = await supabase
            .from('workouts')
            .select(`
                *,
                exercise_logs (*)
            `)
            .eq('user_id', currentUser.id)
            .gte('date', startDateStr)
            .lte('date', endDate);

        // Fetch nutrition data
        const { data: nutritionData } = await supabase
            .from('daily_nutrition')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startDateStr)
            .lte('date', endDate);

        // Fetch body metrics
        const { data: metricsData } = await supabase
            .from('body_metrics')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startDateStr)
            .lte('date', endDate);

        // Fetch meals
        const { data: mealsData } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startDateStr)
            .lte('date', endDate);

        // Convert to localStorage format
        const fitnessData = JSON.parse(localStorage.getItem('fitnessData')) || { logs: [], streak: 0 };

        // Merge workouts into logs
        if (workouts) {
            workouts.forEach(workout => {
                const existingLogIndex = fitnessData.logs.findIndex(log => log.date === workout.date);

                // Build exercise performance from exercise_logs
                const exercisePerformance = {};
                if (workout.exercise_logs) {
                    workout.exercise_logs.forEach(log => {
                        exercisePerformance[log.exercise_name] = {
                            sets: log.set_number,
                            reps: log.reps,
                            weight: log.weight,
                            date: log.created_at
                        };
                    });
                }

                // Find nutrition for this date
                const nutrition = nutritionData?.find(n => n.date === workout.date);
                const metrics = metricsData?.find(m => m.date === workout.date);
                const dayMeals = mealsData?.filter(m => m.date === workout.date) || [];

                const logData = {
                    date: workout.date,
                    workoutCompleted: workout.completed,
                    exercisePerformance: exercisePerformance,
                    nutritionConsumed: {
                        calories: nutrition?.calories || 0,
                        protein: nutrition?.protein || 0,
                        carbs: nutrition?.carbs || 0,
                        fat: nutrition?.fat || 0
                    },
                    waterIntake: nutrition?.water_intake || 0,
                    bodyWeight: metrics?.weight || USER_PROFILE.weight,
                    meals: dayMeals.map(meal => ({
                        name: meal.meal_name,
                        nutrition: meal.nutrition
                    }))
                };

                if (existingLogIndex !== -1) {
                    // Merge: keep newer data (prefer local if it's newer)
                    const existing = fitnessData.logs[existingLogIndex];
                    const existingTime = existing.updatedAt || existing.date;
                    const cloudTime = workout.updated_at || workout.date;

                    // Only overwrite if cloud data is newer OR if local doesn't have workout completed
                    if (!existing.workoutCompleted || new Date(cloudTime) > new Date(existingTime)) {
                        fitnessData.logs[existingLogIndex] = {
                            ...logData,
                            updatedAt: cloudTime
                        };
                    }
                } else {
                    fitnessData.logs.push({
                        ...logData,
                        updatedAt: workout.updated_at || new Date().toISOString()
                    });
                }
            });
        }

        // Recalculate streak after syncing
        const sortedLogs = fitnessData.logs
            .filter(log => log.workoutCompleted)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedLogs.length === 0) {
            fitnessData.streak = 0;
        } else {
            let streak = 1;
            let currentDate = new Date(sortedLogs[0].date);
            currentDate.setHours(0, 0, 0, 0);

            for (let i = 1; i < sortedLogs.length; i++) {
                const logDate = new Date(sortedLogs[i].date);
                logDate.setHours(0, 0, 0, 0);

                let expectedDate = new Date(currentDate);
                expectedDate.setDate(expectedDate.getDate() - 1);

                while (isRestDay(expectedDate.toISOString().split('T')[0])) {
                    expectedDate.setDate(expectedDate.getDate() - 1);
                }

                if (logDate.getTime() === expectedDate.getTime()) {
                    streak++;
                    currentDate = logDate;
                } else {
                    let daysBetween = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));
                    let allRestDays = true;

                    for (let d = 1; d < daysBetween; d++) {
                        let checkDate = new Date(currentDate);
                        checkDate.setDate(checkDate.getDate() - d);
                        if (!isRestDay(checkDate.toISOString().split('T')[0])) {
                            allRestDays = false;
                            break;
                        }
                    }

                    if (allRestDays && daysBetween <= 7) {
                        streak++;
                        currentDate = logDate;
                    } else {
                        break;
                    }
                }
            }
            fitnessData.streak = streak;
        }

        // Save merged data to localStorage
        localStorage.setItem('fitnessData', JSON.stringify(fitnessData));

        console.log(`✅ Cloud data synced to local storage (${workouts?.length || 0} workouts, streak: ${fitnessData.streak})`);
        return { success: true };

    } catch (error) {
        console.error('Sync cloud to local error:', error);
        return { success: false, error: error.message };
    }
}

async function syncLocalToCloud() {
    if (!currentUser) return;

    try {
        const fitnessData = JSON.parse(localStorage.getItem('fitnessData'));
        if (!fitnessData || !fitnessData.logs) return { success: true };

        // Upload each day's data
        for (const log of fitnessData.logs) {
            await saveWorkoutToCloud(log);
        }

        console.log('✅ Local data synced to cloud');
        return { success: true };

    } catch (error) {
        console.error('Sync local to cloud error:', error);
        return { success: false, error: error.message };
    }
}

// ===========================
// OFFLINE SYNC QUEUE
// ===========================

let offlineSyncQueue = [];

function queueOfflineChange(operation, data) {
    offlineSyncQueue.push({
        operation,
        data,
        timestamp: new Date().toISOString()
    });

    // Save queue to localStorage
    localStorage.setItem('offlineSyncQueue', JSON.stringify(offlineSyncQueue));
}

async function processSyncQueue() {
    if (!currentUser || offlineSyncQueue.length === 0) return;

    console.log(`Processing ${offlineSyncQueue.length} queued changes...`);

    try {
        for (const item of offlineSyncQueue) {
            switch (item.operation) {
                case 'saveWorkout':
                    await saveWorkoutToCloud(item.data);
                    break;
                case 'saveNutrition':
                    await saveNutritionToCloud(item.data.date, item.data.nutrition, item.data.meals);
                    break;
                case 'saveBodyMetrics':
                    await saveBodyMetricsToCloud(item.data.date, item.data.weight, item.data.water);
                    break;
            }
        }

        // Clear queue
        offlineSyncQueue = [];
        localStorage.setItem('offlineSyncQueue', JSON.stringify(offlineSyncQueue));

        console.log('✅ Sync queue processed');
        return { success: true };

    } catch (error) {
        console.error('Process sync queue error:', error);
        return { success: false, error: error.message };
    }
}

// Load offline queue on init
const savedQueue = localStorage.getItem('offlineSyncQueue');
if (savedQueue) {
    offlineSyncQueue = JSON.parse(savedQueue);
}

// Network status monitoring
window.addEventListener('online', async () => {
    console.log('📡 Back online! Processing queued changes...');
    await processSyncQueue();
});
