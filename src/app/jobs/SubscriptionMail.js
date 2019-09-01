import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class SubscriptionMail {
  get key() {
    return 'SubscriptionMail';
  }

  async handle({ data }) {
    const { meetupData, subscriber } = data;

    await Mail.sendMail({
      to: `${meetupData.organizer.name} <${meetupData.organizer.email}>`,
      subject: 'Inscrição realizada!',
      template: 'subscription',
      context: {
        organizerName: meetupData.organizer.name,
        subscriberName: subscriber.name,
        subscriberEmail: subscriber.email,
        meetupTitle: meetupData.title,
        meetupDate: format(
          parseISO(meetupData.start_date),
          "'dia' dd 'de' MMMM', às' H:mm'h'",
          {
            locale: pt
          }
        )
      }
    });
  }
}

export default new SubscriptionMail();
