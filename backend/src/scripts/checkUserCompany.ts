import models from '../models';

(async () => {
  try {
    const user = await (models as any).User.findByPk('00000000-0000-0000-0000-000000000001', {
      include: [{
        model: (models as any).Company,
        through: { attributes: [] }
      }]
    });
    
    console.log('User:', user?.toJSON());
    console.log('Companies:', user?.Companies?.map((c: any) => c.toJSON()));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
