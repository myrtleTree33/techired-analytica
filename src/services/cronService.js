import cron from 'node-cron';
import processLangJob from './jobs/processLangJob';
import logger from '../logger';

const initCron = () => {
  logger.info('Scheduling cron jobs..');
  //   cron.schedule('1 */9 * * *', processLangJob);
  processLangJob();
};

export default initCron;
