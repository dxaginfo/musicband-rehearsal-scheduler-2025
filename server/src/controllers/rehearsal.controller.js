const { query, getClient } = require('../db/database');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all rehearsals for user's groups
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getAllRehearsals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user's groups
    const groupQuery = `
      SELECT g.id
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1
    `;
    
    const groupResult = await query(groupQuery, [userId]);
    
    if (groupResult.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          rehearsals: []
        }
      });
    }
    
    const groupIds = groupResult.rows.map(group => group.id);
    
    // Get rehearsals for these groups
    const rehearsalQuery = `
      SELECT 
        r.id, 
        r.title, 
        r.description, 
        r.location, 
        r.start_time, 
        r.end_time, 
        r.is_recurring, 
        r.recurrence_pattern,
        r.created_at,
        r.updated_at,
        g.id AS group_id,
        g.name AS group_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'status', a.status
            )
          )
          FROM attendance a
          JOIN users u ON a.user_id = u.id
          WHERE a.rehearsal_id = r.id
        ) AS attendees
      FROM rehearsals r
      JOIN groups g ON r.group_id = g.id
      WHERE r.group_id = ANY($1)
      ORDER BY r.start_time ASC
    `;
    
    const rehearsalResult = await query(rehearsalQuery, [groupIds]);
    
    // Format the response
    const rehearsals = rehearsalResult.rows.map(rehearsal => {
      return {
        id: rehearsal.id,
        title: rehearsal.title,
        description: rehearsal.description,
        location: rehearsal.location,
        startTime: rehearsal.start_time,
        endTime: rehearsal.end_time,
        isRecurring: rehearsal.is_recurring,
        recurrencePattern: rehearsal.recurrence_pattern,
        group: {
          id: rehearsal.group_id,
          name: rehearsal.group_name
        },
        attendees: rehearsal.attendees || [],
        createdAt: rehearsal.created_at,
        updatedAt: rehearsal.updated_at
      };
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        rehearsals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rehearsal by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getRehearsalById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rehearsalId } = req.params;
    
    // Verify user has access to this rehearsal
    const accessQuery = `
      SELECT r.*, g.name AS group_name
      FROM rehearsals r
      JOIN groups g ON r.group_id = g.id
      JOIN group_members gm ON g.id = gm.group_id
      WHERE r.id = $1 AND gm.user_id = $2
    `;
    
    const accessResult = await query(accessQuery, [rehearsalId, userId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Rehearsal not found or you do not have access'
      });
    }
    
    const rehearsal = accessResult.rows[0];
    
    // Get attendees
    const attendeesQuery = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        a.status,
        a.response_time,
        a.notes
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.rehearsal_id = $1
    `;
    
    const attendeesResult = await query(attendeesQuery, [rehearsalId]);
    
    // Format the response
    const formattedRehearsal = {
      id: rehearsal.id,
      title: rehearsal.title,
      description: rehearsal.description,
      location: rehearsal.location,
      startTime: rehearsal.start_time,
      endTime: rehearsal.end_time,
      isRecurring: rehearsal.is_recurring,
      recurrencePattern: rehearsal.recurrence_pattern,
      group: {
        id: rehearsal.group_id,
        name: rehearsal.group_name
      },
      attendees: attendeesResult.rows.map(attendee => ({
        id: attendee.id,
        firstName: attendee.first_name,
        lastName: attendee.last_name,
        status: attendee.status,
        responseTime: attendee.response_time,
        notes: attendee.notes
      })),
      createdBy: rehearsal.created_by,
      createdAt: rehearsal.created_at,
      updatedAt: rehearsal.updated_at
    };
    
    return res.status(200).json({
      status: 'success',
      data: {
        rehearsal: formattedRehearsal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new rehearsal
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.createRehearsal = async (req, res, next) => {
  const client = await getClient();
  
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }
    
    const userId = req.user.id;
    const { 
      title, 
      description, 
      location, 
      startTime, 
      endTime, 
      isRecurring, 
      recurrencePattern,
      groupId
    } = req.body;
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Verify user is a member of the group
    const groupMemberQuery = `
      SELECT * FROM group_members 
      WHERE group_id = $1 AND user_id = $2
    `;
    
    const groupMemberResult = await client.query(groupMemberQuery, [groupId, userId]);
    
    if (groupMemberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this group'
      });
    }
    
    // Create rehearsal
    const rehearsalId = uuidv4();
    const createRehearsalQuery = `
      INSERT INTO rehearsals (
        id, title, description, location, start_time, end_time,
        is_recurring, recurrence_pattern, group_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const rehearsalValues = [
      rehearsalId,
      title,
      description,
      location,
      new Date(startTime),
      new Date(endTime),
      isRecurring || false,
      isRecurring ? recurrencePattern : null,
      groupId,
      userId
    ];
    
    const rehearsalResult = await client.query(createRehearsalQuery, rehearsalValues);
    const newRehearsal = rehearsalResult.rows[0];
    
    // Get all group members to create attendance records
    const groupMembersQuery = `
      SELECT user_id FROM group_members WHERE group_id = $1
    `;
    
    const groupMembersResult = await client.query(groupMembersQuery, [groupId]);
    
    // Create attendance records for all group members
    for (const member of groupMembersResult.rows) {
      const attendanceQuery = `
        INSERT INTO attendance (
          id, rehearsal_id, user_id, status
        )
        VALUES ($1, $2, $3, $4)
      `;
      
      await client.query(attendanceQuery, [
        uuidv4(),
        rehearsalId,
        member.user_id,
        'pending'
      ]);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Get group info for response
    const groupQuery = `SELECT id, name FROM groups WHERE id = $1`;
    const groupResult = await query(groupQuery, [groupId]);
    
    // Format the response
    const formattedRehearsal = {
      id: newRehearsal.id,
      title: newRehearsal.title,
      description: newRehearsal.description,
      location: newRehearsal.location,
      startTime: newRehearsal.start_time,
      endTime: newRehearsal.end_time,
      isRecurring: newRehearsal.is_recurring,
      recurrencePattern: newRehearsal.recurrence_pattern,
      group: {
        id: groupResult.rows[0].id,
        name: groupResult.rows[0].name
      },
      createdAt: newRehearsal.created_at,
      updatedAt: newRehearsal.updated_at
    };
    
    return res.status(201).json({
      status: 'success',
      message: 'Rehearsal created successfully',
      data: {
        rehearsal: formattedRehearsal
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Update a rehearsal
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.updateRehearsal = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }
    
    const userId = req.user.id;
    const { rehearsalId } = req.params;
    const { 
      title, 
      description, 
      location, 
      startTime, 
      endTime, 
      isRecurring, 
      recurrencePattern
    } = req.body;
    
    // Verify user has permission to update this rehearsal
    const permissionQuery = `
      SELECT r.* FROM rehearsals r
      JOIN groups g ON r.group_id = g.id
      JOIN group_members gm ON g.id = gm.group_id
      WHERE r.id = $1 AND gm.user_id = $2 AND (r.created_by = $2 OR gm.role = 'admin')
    `;
    
    const permissionResult = await query(permissionQuery, [rehearsalId, userId]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this rehearsal'
      });
    }
    
    // Update rehearsal
    const updateRehearsalQuery = `
      UPDATE rehearsals
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        location = COALESCE($3, location),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        is_recurring = COALESCE($6, is_recurring),
        recurrence_pattern = CASE 
          WHEN $6 = false THEN NULL
          ELSE COALESCE($7, recurrence_pattern)
        END,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    
    const updateValues = [
      title,
      description,
      location,
      startTime ? new Date(startTime) : null,
      endTime ? new Date(endTime) : null,
      isRecurring !== undefined ? isRecurring : null,
      recurrencePattern,
      rehearsalId
    ];
    
    const updateResult = await query(updateRehearsalQuery, updateValues);
    const updatedRehearsal = updateResult.rows[0];
    
    // Get group info for response
    const groupQuery = `SELECT id, name FROM groups WHERE id = $1`;
    const groupResult = await query(groupQuery, [updatedRehearsal.group_id]);
    
    // Format the response
    const formattedRehearsal = {
      id: updatedRehearsal.id,
      title: updatedRehearsal.title,
      description: updatedRehearsal.description,
      location: updatedRehearsal.location,
      startTime: updatedRehearsal.start_time,
      endTime: updatedRehearsal.end_time,
      isRecurring: updatedRehearsal.is_recurring,
      recurrencePattern: updatedRehearsal.recurrence_pattern,
      group: {
        id: groupResult.rows[0].id,
        name: groupResult.rows[0].name
      },
      createdAt: updatedRehearsal.created_at,
      updatedAt: updatedRehearsal.updated_at
    };
    
    return res.status(200).json({
      status: 'success',
      message: 'Rehearsal updated successfully',
      data: {
        rehearsal: formattedRehearsal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a rehearsal
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.deleteRehearsal = async (req, res, next) => {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { rehearsalId } = req.params;
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Verify user has permission to delete this rehearsal
    const permissionQuery = `
      SELECT r.* FROM rehearsals r
      JOIN groups g ON r.group_id = g.id
      JOIN group_members gm ON g.id = gm.group_id
      WHERE r.id = $1 AND gm.user_id = $2 AND (r.created_by = $2 OR gm.role = 'admin')
    `;
    
    const permissionResult = await client.query(permissionQuery, [rehearsalId, userId]);
    
    if (permissionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this rehearsal'
      });
    }
    
    // Delete attendance records first (due to foreign key constraints)
    await client.query('DELETE FROM attendance WHERE rehearsal_id = $1', [rehearsalId]);
    
    // Delete rehearsal
    await client.query('DELETE FROM rehearsals WHERE id = $1', [rehearsalId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return res.status(200).json({
      status: 'success',
      message: 'Rehearsal deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get optimal rehearsal times based on group member availability
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getOptimalRehearsalTimes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;
    
    // Verify user is a member of the group
    const groupMemberQuery = `
      SELECT * FROM group_members 
      WHERE group_id = $1 AND user_id = $2
    `;
    
    const groupMemberResult = await query(groupMemberQuery, [groupId, userId]);
    
    if (groupMemberResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this group'
      });
    }
    
    // Get all group members
    const membersQuery = `
      SELECT user_id FROM group_members WHERE group_id = $1
    `;
    
    const membersResult = await query(membersQuery, [groupId]);
    const memberIds = membersResult.rows.map(m => m.user_id);
    
    // Get availability for all members
    const availabilityQuery = `
      SELECT 
        a.user_id,
        a.day_of_week,
        a.start_time,
        a.end_time
      FROM availability a
      WHERE a.user_id = ANY($1) AND a.is_recurring = true
      ORDER BY a.day_of_week, a.start_time
    `;
    
    const availabilityResult = await query(availabilityQuery, [memberIds]);
    
    // Process availability to find optimal times
    const availabilityByDay = [0, 1, 2, 3, 4, 5, 6].map(day => {
      const dayAvailability = availabilityResult.rows.filter(a => a.day_of_week === day);
      return {
        day,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
        memberAvailability: dayAvailability
      };
    });
    
    // Find overlapping time slots
    const optimalTimeSlots = availabilityByDay.map(dayData => {
      const { day, dayName, memberAvailability } = dayData;
      
      // If no members have availability for this day, return empty slots
      if (memberAvailability.length === 0) {
        return {
          day,
          dayName,
          slots: []
        };
      }
      
      // Group availability by user
      const userAvailability = {};
      memberAvailability.forEach(a => {
        if (!userAvailability[a.user_id]) {
          userAvailability[a.user_id] = [];
        }
        userAvailability[a.user_id].push({
          start: a.start_time,
          end: a.end_time
        });
      });
      
      // Find overlapping slots
      // This is a simplified algorithm - a real one would be more complex
      const slots = [];
      const timePoints = [];
      
      Object.values(userAvailability).forEach(times => {
        times.forEach(time => {
          timePoints.push({ time: time.start, type: 'start', userId: time.userId });
          timePoints.push({ time: time.end, type: 'end', userId: time.userId });
        });
      });
      
      timePoints.sort((a, b) => {
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return a.type === 'start' ? -1 : 1; // Start times come before end times
      });
      
      let activeUsers = new Set();
      let lastTime = null;
      
      timePoints.forEach(point => {
        if (point.type === 'start') {
          if (activeUsers.size > 0 && lastTime) {
            // We have a time slot with the previous set of users
            slots.push({
              start: lastTime,
              end: point.time,
              memberCount: activeUsers.size,
              memberPercentage: (activeUsers.size / memberIds.length) * 100
            });
          }
          activeUsers.add(point.userId);
        } else {
          if (activeUsers.size > 0 && lastTime) {
            // We have a time slot with the current set of users
            slots.push({
              start: lastTime,
              end: point.time,
              memberCount: activeUsers.size,
              memberPercentage: (activeUsers.size / memberIds.length) * 100
            });
          }
          activeUsers.delete(point.userId);
        }
        lastTime = point.time;
      });
      
      // Sort slots by member count (highest first)
      slots.sort((a, b) => b.memberCount - a.memberCount);
      
      return {
        day,
        dayName,
        slots
      };
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        optimalTimeSlots
      }
    });
  } catch (error) {
    next(error);
  }
};