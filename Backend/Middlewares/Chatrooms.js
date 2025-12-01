import pool from '../Config/Database.js';

export const verifyGroupMember = async (request, response, next) => {
  try {
    const userId = request.user?.userid;
    const { groupid: paramGroupId } = request.params;
    const { groupid: bodyGroupId } = request.body || {};

    const groupid = paramGroupId || bodyGroupId;

    if (!userId || !groupid) {
      return response
        .status(400)
        .json('Missing user or group information for authorization');
    }

    const query =
      'SELECT 1 FROM GroupMembers WHERE groupid = $1 AND userid = $2 LIMIT 1';
    const values = [groupid, userId];

    const result = await pool.query(query, values);

    if (!result.rowCount) {
      return response
        .status(403)
        .json('You are not authorized to view this group');
    }

    return next();
  } catch (error) {
    console.error('Error in verifyGroupMember middleware:', error);
    return response
      .status(500)
      .json('Server error while verifying group membership');
  }
};