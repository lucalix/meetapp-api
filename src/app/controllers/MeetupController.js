import * as Yup from 'yup';
import { isBefore, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';
import File from '../models/File';

class MeetupController {
  async index(req, res) {
    const { page = 1, limit = 20, order = 'desc' } = req.query;

    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      order: [['id', order]],
      limit,
      offset: (page - 1) * limit,
      attributes: [
        'id',
        'title',
        'description',
        'start_date',
        'end_date',
        'address',
        'address_complement',
        'past'
      ],
      include: [
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url']
        }
      ]
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      banner_id: Yup.number().required(),
      start_date: Yup.date().required(),
      end_date: Yup.date().required(),
      address: Yup.string().required(),
      address_complement: Yup.string()
    });

    try {
      await schema.validate(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.errors[0] });
    }

    const { start_date, end_date } = req.body;

    /**
     * Check for paste dates
     */
    if (isBefore(parseISO(start_date), new Date())) {
      return res.status(400).json({ error: 'Paste date are not permited.' });
    }

    /**
     * Check if end time is less than start time
     */
    if (isBefore(parseISO(end_date), parseISO(start_date))) {
      return res
        .status(400)
        .json({ error: 'Start time must be greater than end time' });
    }

    req.body.user_id = req.userId;

    const meetup = await Meetup.create(req.body);

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      banner_id: Yup.number(),
      start_date: Yup.date(),
      end_date: Yup.date(),
      address: Yup.string(),
      address_complement: Yup.string()
    });

    try {
      await schema.validate(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.errors[0] });
    }

    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup not found.' });
    }

    /**
     * Check if user is meetup's organizer
     */
    if (req.userId !== meetup.user_id) {
      return res
        .status(401)
        .json({ error: "You don't have permission to update this meetup." });
    }

    /**
     * Check for past dates
     */

    if (meetup.past) {
      return res
        .status(401)
        .json({ error: 'You cannot edit meetups already occurred.' });
    }

    if (req.body.user_id) {
      return res
        .status(401)
        .json({ error: "You cannot change meetup's owner" });
    }

    const updatedMeetup = await meetup.update(req.body);

    return res.json(updatedMeetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup not found.' });
    }

    /**
     * Check if user is meetup's organizer
     */
    if (req.userId !== meetup.user_id) {
      return res
        .status(401)
        .json({ error: "You don't have permission to delete this meetup." });
    }

    /**
     * Check for past dates
     */

    if (meetup.past) {
      return res
        .status(401)
        .json({ error: 'You cannot delete meetups already occurred.' });
    }

    try {
      await Meetup.destroy({
        where: { id: meetup.id }
      });

      return res.status(200).json();
    } catch (err) {
      return res
        .status(400)
        .json({ error: "Can't possible delete this meetup." });
    }
  }
}

export default new MeetupController();
