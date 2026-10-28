// Notification-only service worker: no private responses or case data are cached.
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{}}catch{}event.waitUntil(self.registration.showNotification('AL AHRAM · الأهرام',{body:'تحديث جديد في مساحة العمل · New workspace update',icon:'/brand/AL_AHRAM_Symbol_Brand_Full_Color.png',tag:String(data.tag||'workspace'),data:{url:'/app/notifications'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow('/app/notifications'));});
