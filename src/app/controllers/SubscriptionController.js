import { Op } from 'sequelize';
import MeetupSubscription from '../models/MeetupSubscription';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';
import Queue from '../../lib/Queue';
import SubscriptionMail from '../jobs/SubscriptionMail';

class SubscriptionController {
  async index(req, res) {
    const meetups = await Meetup.findAll({
      where: {
        start_date: {
          [Op.gt]: new Date()
        }
      },
      order: ['start_date'],
      attributes: ['id', 'title', 'start_date', 'end_date'],
      include: [
        {
          model: MeetupSubscription,
          attributes: [],
          where: {
            user_id: req.userId
          }
        },
        {
          model: File,
          as: 'banner',
          attributes: ['path', 'url']
        }
      ]
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup not found.' });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: "You can only sign up for meetups that hasn't occurred."
      });
    }

    /**
     * Check if user is meetup's owner
     */
    if (req.userId === meetup.user_id) {
      return res.status(401).json({ error: 'You are owner of this meetup' });
    }

    /**
     * Checks if the user is already subscribed to meetup
     */

    const checkSubscribe = await MeetupSubscription.findOne({
      where: {
        meetup_id: req.params.id,
        user_id: req.userId
      }
    });

    if (checkSubscribe) {
      return res
        .status(401)
        .json({ error: 'You cannot sign up for the same meetup twice' });
    }

    /**
     * Checks if the user is subscribed to a meetup that occurs at the same time.
     */

    const userSubscriptions = await MeetupSubscription.findAll({
      where: {
        user_id: req.userId
      },
      include: [
        {
          model: Meetup,
          as: 'meetup',
          where: {
            [Op.or]: [
              {
                start_date: {
                  [Op.between]: [meetup.start_date, meetup.end_date]
                }
              },
              {
                end_date: {
                  [Op.between]: [meetup.start_date, meetup.end_date]
                }
              },
              {
                [Op.and]: [
                  {
                    start_date: {
                      [Op.gte]: meetup.start_date
                    }
                  },
                  {
                    end_date: {
                      [Op.lte]: meetup.end_date
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    });

    if (userSubscriptions[0]) {
      return res.status(401).json({
        error:
          'You are subscribed to a meetup that will take place at the same time.'
      });
    }

    const subscription = await MeetupSubscription.create({
      meetup_id: req.params.id,
      user_id: req.userId
    });

    /**
     * Get data to send e-mail
     */

    const meetupData = await Meetup.findByPk(req.params.id, {
      attributes: ['title', 'start_date'],
      include: [
        {
          model: User,
          as: 'organizer',
          attributes: ['name', 'email']
        }
      ]
    });

    const subscriber = await User.findByPk(req.userId, {
      attributes: ['name', 'email']
    });

    await Queue.add(SubscriptionMail.key, {
      meetupData,
      subscriber
    });

    return res.json(subscription);
  }
}

export default new SubscriptionController();
