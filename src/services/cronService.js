import cron from 'node-cron';
import processLangJob from './jobs/processLangJob';
import logger from '../logger';
import processUserLangsJob from './jobs/processUserLang';

const initCron = () => {
  logger.info('Scheduling cron jobs..');
  //   cron.schedule('1 */9 * * *', processLangJob);
  processLangJob();
  // processUserLangsJob();
};

export default initCron;
