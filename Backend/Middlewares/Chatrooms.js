import pool from '../Config/Database.js'

export const verifyGroupMember = async (request, response, next) => {
    const { body: { userid }, params: { groupid } } = request;

    const query = 'Select * from GroupMembers where groupid = $1 and userid = $2'
    const values = [groupid, userid]

    const result = await pool.query(query, values);

    if (!result.rowCount)
        return response.status(400).json("You are not authorized to view this group");
    next();
}