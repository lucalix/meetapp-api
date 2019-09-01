import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class AvailableController {
  async index(req, res) {
    const { date, limit = 10, page = 1 } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date invalid.' });
    }

    const searchDate = parseISO(date);

    const availableMeetups = await Meetup.findAll({
      where: {
        start_date: {
          [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)]
        }
      },
      limit,
      offset: (page - 1) * limit,
      attributes: [
        'id',
        'title',
        'description',
        'start_date',
        'end_date',
        'address',
        'address_complement'
      ],
      include: [
        {
          model: User,
          as: 'organizer',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['url', 'path']
            }
          ]
        }
      ]
    });

    return res.json(availableMeetups);
  }
}

export default new AvailableController();
