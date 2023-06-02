

    import {
        computePosition,
        flip,
        shift,
        offset,
        arrow,
      } from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.2.7/+esm';

    [].slice.call(document.querySelector('.country_select').querySelectorAll('option')).sort((a,b) => (a.textContent > b.textContent) ? 1 : ((b.textContent > a.textContent) ? -1 : 0)).forEach((cso,csoi)=>document.querySelector('.country_select').appendChild(cso));
    
    async function getDeliveryDate(cc) {
        let template;
        metafield_array.forEach(ma=>{
            if (ma.template==='product') {
                if (selected_product.handle === ma.handle) {
                    template = ma;
                };
            } else if (ma.template==='collection') {
                if (template) {
                    if (template.template === 'product') return;
                };
                product_collections.forEach(pc=>{
                    if (pc.handle === ma.handle) {
                        template = ma;
                    }
                });
            };
        });
        //Check if enabled
        if (template) {
            if (template.settings.find(x=>x.id === 'status').value === 0) template = null;
        };
        if (!template) {document.querySelector('.eddp_maincontainer').style.display = 'none'; return;};
        document.querySelector('.eddp_maincontainer').style.display = 'block';

        //Pre-select country in dropdown
        if ([].slice.call(document.querySelector('.country_select').querySelectorAll('option')).find(x=>x.getAttribute('value')===cc)) {
            document.querySelector('.country_select').value = cc;
        } else {
            document.querySelector('.country_select').value = document.querySelector('.country_select').querySelectorAll('option')[0].getAttribute('value');
        }

        //Check currency choice
        let price_display = template.settings.find(x=>x.id === 'priceDisplay').value[0];
        //Define methods
        let default_methods = template.deliveryMethods;
        let country_methods = template.countries;

        let target_methods = {type: 'default', value: default_methods};

        let matched_country = function(){
            let getcountry = country_methods.find(x=>x.code === cc);
            if (getcountry) {
                if (getcountry.profile[0].min !== "" && getcountry.profile[0].max !== "") {
                    return country_methods.find(x=>x.code === cc);
                } else {
                    return null;
                }
            } else {
                return null;
            }   
        }();
        if (matched_country) {
            target_methods = {type: 'country', value: matched_country.profile}
        };

        function formatCurrencyPrice(price){
            if (price_display === 'base' /*|| matched_country.localpricing.ignore*/ || !Shopify.currency) {
                return template.settings.find(x=>x.id === 'shopcursym').value+price
            } else if (price_display === 'markets') {
                //visitors code Shopify.currency.active
                if (Shopify.currency.active !== template.settings.find(x=>x.id === 'shopcurcode').value) {
                    let selected_country = country_methods.find(x=>x.localpricing.code === Shopify.currency.active);
                    if (selected_country.localpricing.rounding) {
                        let rounded = Math.ceil((Number(price)*Number(Shopify.currency.rate))/selected_country.localpricing.rounding)*selected_country.localpricing.rounding;
                        if (selected_country.localpricing.ending) {
                            return currency_symbol+(rounded-1)+'.'+selected_country.localpricing.ending;
                        } else {
                            return currency_symbol+rounded+'.00';
                        };
                    } else {
                        return currency_symbol+Number(price).toFixed(2);
                    };
                } else {
                    return template.settings.find(x=>x.id === 'shopcursym').value+Number(price).toFixed(2);
                };
            };
        }

        let shippingPriceOnly, freeShippingNoRequirements, freeShippingPriceRequirements, freeShippingWeightRequirements,weightOnlyNoFreeRequirements;
        if (matched_country) {
            //Filter for Price only
            shippingPriceOnly = target_methods.value.filter(x=>!x.min_order_subtotal && !x.max_order_subtotal && !x.weight_low && !x.weight_high && Number(x.price) === 0);
            //Filter results if there are min spends
            freeShippingNoRequirements = target_methods.value.filter(x=>!x.min_order_subtotal && !x.max_order_subtotal && !x.weight_low && !x.weight_high && Number(x.price) === 0);
            freeShippingPriceRequirements = target_methods.value.filter(x=>x.min_order_subtotal && !x.weight_low && !x.weight_high && Number(x.price) === 0 || x.max_order_subtotal && !x.weight_low && !x.weight_high && Number(x.price) === 0);
            freeShippingWeightRequirements = target_methods.value.filter(x=>!x.min_order_subtotal && !x.max_order_subtotal && x.weight_low && Number(x.price) === 0 || !x.min_order_subtotal && !x.max_order_subtotal && x.weight_high && Number(x.price) === 0);
            weightOnlyNoFreeRequirements = target_methods.value.filter(x=>!x.min_order_subtotal && !x.max_order_subtotal && x.weight_low && Number(x.price) !== 0 || !x.min_order_subtotal && !x.max_order_subtotal && x.weight_high && Number(x.price) !== 0);
        }

        document.querySelector('.eddp_container').innerHTML = '';
        target_methods.value.forEach((tm,tmi)=>{
            if (target_methods.type === 'country') {
                if (target_methods.value.filter(x=>!freeShippingPriceRequirements.find(y=>y.id===x.id)).length > 0) {
                    if (freeShippingPriceRequirements.find(x=>x.id===tm.id)) return;
                    if (freeShippingWeightRequirements.find(x=>x.id===tm.id)) return;
                    if (weightOnlyNoFreeRequirements.length > 0 && weightOnlyNoFreeRequirements.reduce((prev, curr) => Number(prev.price) < Number(curr.price) ? prev : curr).id !== tm.id) return;
                }
            }
            let settings_cutoffhour = Number(template.settings.find(x=>x.id==='cutOff').hour);
            let settings_cutoffminute = Number(template.settings.find(x=>x.id==='cutOff').minute);
            let settings_processingdays = Number(template.settings.find(x=>x.id==='processingDays').value);
            let settings_deliverydays = template.settings.find(x=>x.id==='deliveryDays').value;
            let settings_timezone = function() {
                let tztype = template.settings.find(x=>x.id==='timezone').type[0];
                if (tztype === 'default') {
                    return storeTimezone.slice(0,3) + ':' + storeTimezone.slice(3,5)
                    //return template.settings.find(x=>x.id==='timezone').value.split(')')[0].replace('(','').replace('GMT','');
                } else if (tztype === 'visitor') {
                    return null;
                } else if (tztype === 'custom') {
                    return template.settings.find(x=>x.id==='timezone').value;
                }
            }();

            let tz_adjusted_date = function(){
                if (settings_timezone) {
                    let d = new Date();
                    let current_tz_milliseconds = d.getTimezoneOffset()*60*1000;
                    let settings_tz_milliseconds = (Number(settings_timezone.split(':')[0])*60*60*1000) + (Number(settings_timezone.split(':')[1])*60*1000);
                    d.setTime( d.getTime() + (settings_tz_milliseconds-current_tz_milliseconds) );
                    return d;
                } else {
                    return new Date();
                }
            }();

            {%- if block.settings.date_theme == "classic" -%} 
                if (tz_adjusted_date.getHours() < settings_cutoffhour || tz_adjusted_date.getHours() === settings_cutoffhour && tz_adjusted_date.getMinutes() < settings_cutoffminute) {
                    document.querySelector('.eddp_getby_text').innerHTML = function() {
                        let d = new Date();
                        let current_tz_milliseconds = d.getTimezoneOffset()*60*1000;
                        let settings_tz_milliseconds = (Number(settings_timezone.split(':')[0])*60*60*1000) + (Number(settings_timezone.split(':')[1])*60*1000);
                        let duration = settings_tz_milliseconds-current_tz_milliseconds;
                        console.log('duration',duration)

                        let milliseconds = Math.floor(duration % 1000),
                        seconds = Math.floor((duration / 1000) % 60),
                        minutes = Math.floor((duration / (1000 * 60)) % 60),
                        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

                        hours = (hours+settings_cutoffhour);
                        minutes = (minutes+settings_cutoffminute);

                        hours = hours < 0 ? ((24 + hours) < 10 ? '0' + (24 - Math.Abs(hours)) : (24 + hours)) : (hours < 10 ? '0' + hours : hours);
                        minutes = minutes < 0 ? ((24 + minutes) < 10 ? '0' + (24 - Math.Abs(minutes)) : (24 + minutes)) : (minutes < 10 ? '0' + minutes : minutes);

                        return "{{ "blocks.estimated-delivery-date.getby-text-before1" | t }}" + ' ' + hours + ':' + minutes + ' ' + "{{ "blocks.estimated-delivery-date.getby-text-before2" | t }}" ;
                    }()
                } else {
                    document.querySelector('.eddp_getby_text').innerHTML = "{{ "blocks.estimated-delivery-date.getby-text-after" | t }}";
                }
            {% endif %}

            let settings_orderprocessingdays = template.settings.find(x=>x.id==='orderProcessing').value.length > 0 ? template.settings.find(x=>x.id==='orderProcessing').value.map(bd=>{
                if (bd==='monday') {
                    return 1
                } else if (bd==='tuesday') {
                    return 2
                } else if (bd==='wednesday') {
                    return 3
                } else if (bd==='thursday') {
                    return 4
                } else if (bd==='friday') {
                    return 5
                } else if (bd==='saturday') {
                    return 6
                } else if (bd==='sunday') {
                    return 0
                }
            }) : []; //Days of the week to process orders
            let settings_orderdeliverydays = template.settings.find(x=>x.id==='deliveryDays').value.length > 0 ? template.settings.find(x=>x.id==='orderProcessing').value.map(bd=>{
                if (bd==='monday') {
                    return 1
                } else if (bd==='tuesday') {
                    return 2
                } else if (bd==='wednesday') {
                    return 3
                } else if (bd==='thursday') {
                    return 4
                } else if (bd==='friday') {
                    return 5
                } else if (bd==='saturday') {
                    return 6
                }
            }) : []; //Days of the week to deliver orders
console.log('settings_orderdeliverydays',settings_orderdeliverydays)
            let settings_orderholidays = template.settings.find(x=>x.id==='holidays').value; //Holidays

            let delivery_days_min = Number(tm.min);
            let delivery_days_max = Number(tm.max);

            let calc_processing_days = function(){
                if (
                    tz_adjusted_date.getHours() > settings_cutoffhour /*&& !settings_orderprocessingdays.some(x=>x===tz_adjusted_date.getDay())*/ || tz_adjusted_date.getHours() === settings_cutoffhour && tz_adjusted_date.getMinutes() > settings_cutoffminute/* && !settings_orderprocessingdays.some(x=>x===tz_adjusted_date.getDay())*/) {
                    return 1+settings_processingdays;
                } else {
                    return settings_processingdays;
                }
            }();//

            let calc_delivery_days_min = function(){
                let dt = new Date(tz_adjusted_date.getTime());
                if (!settings_orderdeliverydays.some(x=>x===tz_adjusted_date.getDay()) || tz_adjusted_date.getMinutes() > settings_cutoffminute && !settings_orderdeliverydays.some(x=>x===tz_adjusted_date.getDay())) {
                    return dt.setDate(dt.getDate() + delivery_days_min+1);
                } else {
                    return dt.setDate(dt.getDate() + delivery_days_min);
                }
            }();
            let calc_delivery_days_max = function(){
                let dt = new Date(tz_adjusted_date.getTime());
                if (!settings_orderdeliverydays.some(x=>x===tz_adjusted_date.getDay()) || tz_adjusted_date.getMinutes() > settings_cutoffminute && !settings_orderdeliverydays.some(x=>x===tz_adjusted_date.getDay())) {
                    return dt.setDate(dt.getDate() + delivery_days_max+1);
                } else {
                    return dt.setDate(dt.getDate() + delivery_days_max);
                }
            }();
            let calc_delivered_days_min = function(){
                let dt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = dt.setDate(dt.getDate() + calc_processing_days);
                let adj_processing_days = (new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date.getTime(),settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value))).getDate()-tz_adjusted_date.getDate())
                let delivery_date_start = dt.setDate(tz_adjusted_date.getDate()+adj_processing_days)
                let delivery_date_end = new Date(delivery_date_start).setDate(new Date(delivery_date_start).getDate()+delivery_days_min)
                let difference_days = Math.ceil((new Date(delivery_date_end).getTime()-new Date(delivery_date_start).getTime())/ (1000 * 3600 * 24));
                return (new Date(adjustForBusinessDays(delivery_date_start.getTime(),delivery_date_end.getTime(),settings_orderdeliverydays,settings_orderholidays.filter(x=>x.type==='d'&&x.code===cc).map(x=>x.value))));                
                //let dt = new Date();
                //dt.setDate(dt.getDate() + calc_processing_days + delivery_days_min);
                //return dt;
            }();
            let calc_delivered_days_max = function(){
                let dt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = dt.setDate(dt.getDate() + calc_processing_days);
                let adj_processing_days = (new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date.getTime(),settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value))).getDate()-new Date().getDate());
                let delivery_date_start = dt.setDate(tz_adjusted_date.getDate()+adj_processing_days);
                let delivery_date_end = new Date(delivery_date_start).setDate(new Date(delivery_date_start).getDate()+delivery_days_max);
                let difference_days = Math.ceil((new Date(delivery_date_end).getTime()-new Date(delivery_date_start).getTime())/ (1000 * 3600 * 24));
                console.log('delivery_date_end',delivery_date_end)
                return (new Date(adjustForBusinessDays(delivery_date_start.getTime(),delivery_date_end.getTime(),settings_orderdeliverydays,settings_orderholidays.filter(x=>x.type==='d'&&x.code===cc).map(x=>x.value))));
                //let dt = new Date();
                //dt.setDate(dt.getDate() + calc_processing_days + delivery_days_max);
                //return dt;
            }();

            //Helper allow for business days
            function adjustForBusinessDays(startdate,enddate,bdowa,hdarr) {
                console.log('neww')
                let dt = new Date(startdate).getTime();
                //let dt = new Date(tz_adjusted_date.getTime());
                //let startdate = tz_adjusted_date.getTime();
                //let enddate = new Date(tz_adjusted_date.getTime()+(days*24*60*60*1000)).getTime();
                let countdate = dt;
                console.log('enddate',enddate)
                while (countdate <= enddate) {
                    console.log('new Date(countdate).getDay()',new Date(countdate).getDay())
                    if (!bdowa.some(x=>x===new Date(countdate).getDay())) {
                        console.log('add to end date');
                        
                        enddate = new Date(enddate).setDate(new Date(enddate).getDate()+1);
                    };
                    if (hdarr.some(x=>new Date(x).getFullYear()===new Date(countdate).getFullYear() && new Date(x).getMonth()===new Date(countdate).getMonth() && new Date(x).getDate()===new Date(countdate).getDate())) {
                        enddate = new Date(enddate).setDate(new Date(enddate).getDate()+1);
                    };
                    countdate = new Date(countdate).setDate(new Date(countdate).getDate()+1);
                    console.log('countdate',countdate)
                };
                return enddate;
            }

            let date_formated_min, date_formated_max, processing_formated, ordered_formated;
            {% if block.settings.date_format == 'autoddmm' %}
                let copydt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = copydt.setDate(copydt.getDate() + calc_processing_days);
                let dt = new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date,settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value)))
                processing_formated = dt.toLocaleDateString(Shopify.locale+'-'+Shopify.country, { day:"numeric", month:"short" });

                ordered_formated = new Date().toLocaleDateString(Shopify.locale+'-'+Shopify.country, { day:"numeric", month:"short" });

                date_formated_min = calc_delivered_days_min.toLocaleDateString(Shopify.locale+'-'+Shopify.country, { day:"numeric", month:"short" });
                date_formated_max = calc_delivered_days_max.toLocaleDateString(Shopify.locale+'-'+Shopify.country, { day:"numeric", month:"short" });
            {% elsif block.settings.date_format == 'ddmm' %}
                let copydt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = copydt.setDate(copydt.getDate() + calc_processing_days);
                let dt = new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date,settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value)))
                processing_formated = dt.toLocaleDateString('en-gb', { day:"numeric", month:"short"});

                ordered_formated = new Date().toLocaleDateString('en-gb', { day:"numeric", month:"short"});

                date_formated_min = calc_delivered_days_min.toLocaleDateString('en-gb', { day:"numeric", month:"short"});
                date_formated_max = calc_delivered_days_max.toLocaleDateString('en-gb', { day:"numeric", month:"short"});
            {% elsif block.settings.date_format == 'mmdd' %}
                let copydt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = copydt.setDate(copydt.getDate() + calc_processing_days);
                let dt = new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date,settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value)))
                processing_formated = dt.toLocaleDateString('en-us', { day:"numeric", month:"short"});

                ordered_formated = new Date().toLocaleDateString('en-us', { day:"numeric", month:"short"});

                date_formated_min = calc_delivered_days_min.toLocaleDateString('en-us', { day:"numeric", month:"short"});
                date_formated_max = calc_delivered_days_max.toLocaleDateString('en-us', { day:"numeric", month:"short"});
            {% elsif block.settings.date_format == 'ddmmyyyy' %}
                let copydt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = copydt.setDate(copydt.getDate() + calc_processing_days);
                let dt = new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date,settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value)))
                processing_formated = dt.toLocaleDateString('en-gb', { day:"numeric", month:"short", year: "numeric" });

                ordered_formated = new Date().toLocaleDateString('en-gb', { day:"numeric", month:"short", year: "numeric" });

                date_formated_min = calc_delivered_days_min.toLocaleDateString('en-gb', { day:"numeric", month:"short", year: "numeric" });
                date_formated_max = calc_delivered_days_max.toLocaleDateString('en-gb', { day:"numeric", month:"short", year: "numeric" });
            {% elsif block.settings.date_format == 'mmddyyyy' %}
                let copydt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = copydt.setDate(copydt.getDate() + calc_processing_days);
                let dt = new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date,settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value)))
                processing_formated = dt.toLocaleDateString('en-us', { day:"numeric", month:"short", year: "numeric" });

                ordered_formated = new Date().toLocaleDateString('en-us', { day:"numeric", month:"short", year: "numeric" });

                date_formated_min = calc_delivered_days_min.toLocaleDateString('en-us', { day:"numeric", month:"short", year: "numeric" });
                date_formated_max = calc_delivered_days_max.toLocaleDateString('en-us', { day:"numeric", month:"short", year: "numeric" });
            {% elsif block.settings.date_format == 'wddmm' %}
                let copydt = new Date(tz_adjusted_date.getTime());
                    let endprocessing_date = copydt.setDate(copydt.getDate() + calc_processing_days);
            let dt = new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date,settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value)))
                processing_formated = dt.toLocaleDateString('en-gb', { weekday: "long", day:"numeric", month:"short"});

                ordered_formated = new Date().toLocaleDateString('en-gb', { weekday: "long", day:"numeric", month:"short"});

                date_formated_min = calc_delivered_days_min.toLocaleDateString('en-gb', { weekday: "long", day:"numeric", month:"short"});
                date_formated_max = calc_delivered_days_max.toLocaleDateString('en-gb', { weekday: "long", day:"numeric", month:"short"});
            {% elsif block.settings.date_format == 'wmmdd' %}
                let copydt = new Date(tz_adjusted_date.getTime());
                let endprocessing_date = copydt.setDate(copydt.getDate() + calc_processing_days);
                let dt = new Date(adjustForBusinessDays(tz_adjusted_date.getTime(),endprocessing_date,settings_orderprocessingdays,settings_orderholidays.filter(x=>x.type==='p'&&x.code===cc).map(x=>x.value)))
                processing_formated = dt.toLocaleDateString('en-us' { weekday: "long", day:"numeric", month:"short" });

                ordered_formated = new Date().toLocaleDateString('en-us' { weekday: "long", day:"numeric", month:"short" });

                date_formated_min = calc_delivered_days_min.toLocaleDateString('en-us' { weekday: "long", day:"numeric", month:"short" });
                date_formated_max = calc_delivered_days_max.toLocaleDateString('en-us', { weekday: "long", day:"numeric", month:"short" });
            {% endif %}

            let date_formated;
            {% if block.settings.date_theme == 'classic' %}
                date_formated = date_formated_max;
            {% elsif block.settings.date_theme == 'modern' %}
                date_formated = date_formated_min + ' - ' + date_formated_max;
            {% endif %}

            let container = document.createElement('div');
            document.querySelector('.eddp_container').appendChild(container);
            let shipping_title = document.createElement('div');
            shipping_title.setAttribute('class', 'shipping_title secondary_eddp_font');
            shipping_title.innerHTML = function() {
                if (target_methods.type === 'country') {
                    return tm.name;
                } else if (target_methods.type === 'default') {
                    return tm.title;
                }
            }();
            container.appendChild(shipping_title);
            {%- if block.settings.date_theme == "classic" -%} 
                let flexcontainer = document.createElement('div');
                flexcontainer.style.cssText = `display: flex; justify-content: space-between;`;
                container.appendChild(flexcontainer);
                let ship_range = document.createElement('div');
                ship_range.setAttribute('class', 'shipping_range primary_eddp_font');
                ship_range.innerHTML = date_formated;
                flexcontainer.appendChild(ship_range);
                let ship_price = document.createElement('div');
                ship_price.setAttribute('class', 'shipping_price primary_eddp_font');
                ship_price.innerHTML = function() {
                if (target_methods.type !== 'countryy') {
                    if (tm.price === '0.00' || tm.price === '0,00' || Number(tm.price) === 0) {
                        return 'FREE';
                    } else if (matched_country) {
                        return weightOnlyNoFreeRequirements.length > 1 ? "{{ 'blocks.estimated-delivery-date.text-specific-from' | t }} " + formatCurrencyPrice(tm.price) : formatCurrencyPrice(tm.price);
                    } else {
                        return formatCurrencyPrice(tm.price);
                    };
                } else if (target_methods.type === 'default') {
                    return '';
                }
                }();
                flexcontainer.appendChild(ship_price);
                if (matched_country) {
                    if (weightOnlyNoFreeRequirements.length > 0) addTooltip(ship_price,"{{ 'blocks.estimated-delivery-date.tooltip-weight-price' | t }}");
                };
            {% elsif block.settings.date_theme == "modern" %}
               let flexcontainer = document.createElement('div');
                flexcontainer.style.cssText = `margin-bottom: 10px; display: flex; justify-content: space-between; text-align: center;`;
                container.appendChild(flexcontainer);
            
                let ordered_container = document.createElement('div');
                ordered_container.style.cssText = `flex: 1 0 33.3%; display: flex; flex-direction: column; justify-content: start; align-items: center;`;
                flexcontainer.appendChild(ordered_container);
                let ordered_icon = document.createElement('div');
                ordered_icon.innerHTML = `<svg style="color: #000000; width: 100%; max-width: 32px;" class="svg__icon" focusable="false" viewBox="0 0 1024 1024" aria-hidden="true"><path d="M680.8 309.6H343.2v-33.8c0-2.8 0-5.6 0.2-8.2 0.2-2.8 0.4-5.6 0.6-8.2 0.2-2.8 0.6-5.4 1-8.2 0.4-2.8 0.8-5.4 1.4-8.2s1.2-5.4 1.8-8c0.6-2.6 1.4-5.4 2.2-8 0.8-2.6 1.6-5.2 2.6-7.8l3-7.8c1-2.6 2.2-5 3.4-7.6 1.2-2.4 2.4-5 3.8-7.4 1.4-2.4 2.6-4.8 4-7.2 1.4-2.4 2.8-4.8 4.4-7 1.6-2.2 3.2-4.6 4.8-6.8 1.6-2.2 3.4-4.4 5-6.6 1.8-2.2 3.6-4.2 5.4-6.2 1.8-2 3.8-4 5.8-6s4-3.8 6-5.8 4.2-3.6 6.2-5.4c2.2-1.8 4.4-3.4 6.6-5 2.2-1.6 4.4-3.2 6.8-4.8 2.2-1.6 4.6-3 7-4.4s4.8-2.8 7.2-4c2.4-1.4 5-2.6 7.4-3.8 2.4-1.2 5-2.2 7.6-3.4s5.2-2 7.8-3c2.6-1 5.2-1.8 7.8-2.6 2.6-0.8 5.4-1.6 8-2.2 2.6-0.6 5.4-1.2 8-1.8 2.8-0.6 5.4-1 8.2-1.4 2.8-0.4 5.4-0.8 8.2-1 2.8-0.2 5.6-0.4 8.2-0.6 2.8-0.2 5.6-0.2 8.2-0.2 2.8 0 5.6 0 8.2 0.2 2.8 0.2 5.6 0.4 8.2 0.6 2.8 0.2 5.4 0.6 8.2 1 2.8 0.4 5.4 0.8 8.2 1.4 2.8 0.6 5.4 1.2 8 1.8 2.6 0.6 5.4 1.4 8 2.2 2.6 0.8 5.2 1.6 7.8 2.6l7.8 3c2.6 1 5 2.2 7.6 3.4 2.4 1.2 5 2.4 7.4 3.8 2.4 1.4 4.8 2.6 7.2 4 2.4 1.4 4.8 2.8 7 4.4 2.2 1.6 4.6 3.2 6.8 4.8 2.2 1.6 4.4 3.4 6.6 5 2.2 1.8 4.2 3.6 6.2 5.4 2 1.8 4 3.8 6 5.8s3.8 4 5.8 6c1.8 2 3.6 4.2 5.4 6.2 1.8 2.2 3.4 4.4 5 6.6 1.6 2.2 3.2 4.4 4.8 6.8 1.6 2.2 3 4.6 4.4 7s2.8 4.8 4 7.2 2.6 5 3.8 7.4c1.2 2.4 2.2 5 3.4 7.6l3 7.8c1 2.6 1.8 5.2 2.6 7.8 0.8 2.6 1.6 5.4 2.2 8 0.6 2.6 1.2 5.4 1.8 8s1 5.4 1.4 8.2c0.4 2.8 0.8 5.4 1 8.2s0.4 5.6 0.6 8.2c0.2 2.8 0.2 5.6 0.2 8.2v33.8zM673.4 550l-189 236.2c-1.6 2-3.2 3.6-5.2 5.2s-4 2.8-6.2 4c-2.2 1-4.6 2-7 2.6-2.4 0.6-4.8 0.8-7.4 1h-0.6c-2.4 0-4.8-0.2-7.2-0.8-2.4-0.6-4.6-1.2-6.8-2.4-2.2-1-4.2-2.2-6.2-3.8-2-1.4-3.8-3.2-5.2-5l-81-94.6c-0.8-0.8-1.4-1.8-2-2.6-0.6-1-1.2-1.8-1.8-2.8-0.6-1-1-2-1.4-3l-1.2-3c-0.4-1-0.6-2.2-0.8-3.2-0.2-1-0.4-2.2-0.6-3.2-0.2-1-0.2-2.2-0.2-3.4v-3.4c0-1.2 0.2-2.2 0.4-3.2s0.4-2.2 0.8-3.2c0.2-1 0.6-2.2 1-3.2s0.8-2 1.4-3c0.6-1 1-2 1.6-2.8 0.6-1 1.2-1.8 2-2.8 0.6-0.8 1.4-1.8 2.2-2.4 0.8-0.8 1.6-1.6 2.4-2.2 0.8-0.8 1.8-1.4 2.6-2s1.8-1.2 2.8-1.8c1-0.6 2-1 3-1.4l3-1.2c1-0.4 2.2-0.6 3.2-0.8 1-0.2 2.2-0.4 3.2-0.6 1-0.2 2.2-0.2 3.4-0.2h3.4c1.2 0 2.2 0.2 3.2 0.4s2.2 0.4 3.2 0.8c1 0.2 2.2 0.6 3.2 1s2 0.8 3 1.4c1 0.6 2 1 2.8 1.6 1 0.6 1.8 1.2 2.6 2 0.8 0.6 1.8 1.4 2.4 2.2 0.8 0.8 1.6 1.6 2.2 2.4l54.6 63.6L620.6 508c0.6-0.8 1.4-1.6 2.2-2.4s1.6-1.6 2.4-2.2c0.8-0.8 1.8-1.4 2.6-2 1-0.6 1.8-1.2 2.8-1.8 1-0.6 2-1 3-1.4 1-0.4 2-0.8 3.2-1.2 1-0.4 2.2-0.6 3.2-0.8 1-0.2 2.2-0.4 3.2-0.6 1-0.2 2.2-0.2 3.4-0.2 1.2 0 2.2 0 3.4 0.2 1.2 0 2.2 0.2 3.2 0.4s2.2 0.4 3.2 0.8 2.2 0.6 3.2 1 2 0.8 3 1.4c1 0.6 2 1 2.8 1.6 1 0.6 1.8 1.2 2.6 2 0.8 0.6 1.6 1.4 2.4 2.2 0.8 0.8 1.6 1.6 2.2 2.4 0.8 0.8 1.4 1.8 2 2.6 0.6 1 1.2 1.8 1.8 2.8 0.6 1 1 2 1.4 3 0.4 1 0.8 2 1.2 3.2 0.4 1 0.6 2.2 0.8 3.2 0.2 1 0.4 2.2 0.6 3.2 0.2 1 0.2 2.2 0.2 3.4 0 1.2 0 2.2-0.2 3.4 0 1.2-0.2 2.2-0.4 3.2s-0.4 2.2-0.8 3.2-0.6 2.2-1 3.2-0.8 2-1.4 3c-0.6 1-1 2-1.6 2.8-0.4 0.6-1.2 1.6-1.8 2.4z m257.6-220.6c-3.2-3.2-6.6-6-10.2-8.4s-7.6-4.6-11.6-6.2c-4.2-1.8-8.4-3-12.6-3.8-4.4-0.8-8.8-1.2-13.2-1.2h-135V276c0-3.8 0-7.8-0.2-11.6s-0.4-7.8-0.8-11.6-0.8-7.6-1.4-11.6c-0.6-3.8-1.2-7.6-2-11.4-0.8-3.8-1.6-7.6-2.6-11.4-1-3.8-2-7.4-3-11.2-1.2-3.6-2.4-7.4-3.6-11-1.4-3.6-2.6-7.2-4.2-10.8-1.4-3.6-3-7.2-4.6-10.6s-3.4-7-5.2-10.4-3.8-6.8-5.8-10c-2-3.4-4-6.6-6.2-9.8-2.2-3.2-4.4-6.4-6.6-9.4-2.4-3.2-4.6-6.2-7.2-9.2s-5-6-7.6-8.8c-2.6-2.8-5.2-5.6-8-8.4-2.8-2.8-5.6-5.4-8.4-8-2.8-2.6-5.8-5.2-8.8-7.6-3-2.4-6-4.8-9.2-7.2-3.2-2.4-6.2-4.6-9.4-6.6-3.2-2.2-6.4-4.2-9.8-6.2-3.4-2-6.6-3.8-10-5.8-3.4-1.8-6.8-3.6-10.4-5.2-3.4-1.6-7-3.2-10.6-4.6l-10.8-4.2c-3.6-1.4-7.4-2.6-11-3.6-3.6-1.2-7.4-2.2-11.2-3s-7.6-1.8-11.4-2.6c-3.8-0.8-7.6-1.4-11.4-2-3.8-0.6-7.6-1-11.6-1.4-3.8-0.4-7.8-0.6-11.6-0.8s-7.8-0.2-11.6-0.2-7.8 0-11.6 0.2-7.8 0.4-11.6 0.8-7.6 0.8-11.6 1.4c-3.8 0.6-7.6 1.2-11.4 2s-7.6 1.6-11.4 2.6-7.4 2-11.2 3c-3.6 1.2-7.4 2.4-11 3.6-3.6 1.4-7.2 2.6-10.8 4.2s-7.2 3-10.6 4.6c-3.4 1.6-7 3.4-10.4 5.2s-6.8 3.8-10 5.8c-3.4 2-6.6 4-9.8 6.2-3.2 2.2-6.4 4.4-9.4 6.6s-6.2 4.6-9.2 7.2c-3 2.4-6 5-8.8 7.6-2.8 2.6-5.6 5.2-8.4 8-2.8 2.8-5.4 5.6-8 8.4-2.6 2.8-5.2 5.8-7.6 8.8-2.4 3-4.8 6-7.2 9.2-2.4 3.2-4.6 6.2-6.6 9.4s-4.2 6.4-6.2 9.8c-2 3.4-3.8 6.6-5.8 10-1.8 3.4-3.6 6.8-5.2 10.4-1.6 3.4-3.2 7-4.6 10.6l-4.2 10.8c-1.4 3.6-2.6 7.4-3.6 11-1.2 3.6-2.2 7.4-3 11.2-1 3.8-1.8 7.6-2.6 11.4-0.8 3.8-1.4 7.6-2 11.4-0.6 3.8-1 7.6-1.4 11.6-0.4 3.8-0.6 7.8-0.8 11.6-0.2 3.8-0.2 7.8-0.2 11.6v33.8H140.8c-2.2 0-4.4 0.2-6.6 0.4-2.2 0.2-4.4 0.6-6.6 1-2.2 0.4-4.4 1-6.4 1.6-2.2 0.6-4.2 1.4-6.2 2.2-2 0.8-4 1.8-6 2.8s-3.8 2.2-5.6 3.4c-1.8 1.2-3.6 2.6-5.4 4a52.438 52.438 0 0 0-9.4 9.4c-1.4 1.8-2.8 3.4-4 5.4-1.2 1.8-2.4 3.8-3.4 5.6s-2 4-2.8 6c-0.8 2-1.6 4.2-2.2 6.2-0.6 2.2-1.2 4.2-1.6 6.4-0.4 2.2-0.8 4.4-1 6.6-0.2 2.2-0.4 4.4-0.4 6.6v455.6c0 82.2 69.6 151.8 151.8 151.8h573.8c9.8 0 19.6-1 29.2-2.8s19-4.6 28.2-8.4c9.2-3.8 17.8-8.2 26-13.6s15.8-11.6 23-18.4c3.6-3.4 7-7 10.2-10.8 3.2-3.8 6.2-7.6 9-11.8 2.8-4 5.4-8.2 7.8-12.6 2.4-4.4 4.6-8.8 6.6-13.2 2-4.6 3.6-9.2 5.2-13.8 1.4-4.8 2.8-9.4 3.8-14.4 1-4.8 1.8-9.8 2.2-14.6 0.6-5 0.8-9.8 0.8-14.8V377c0-4.4-0.4-8.8-1.2-13.2-0.8-4.4-2.2-8.6-3.8-12.6s-3.8-8-6.2-11.6c-2.6-3.8-5.4-7.2-8.6-10.2z"></path></svg>`;
                ordered_container.appendChild(ordered_icon);
                let ordered_text = document.createElement('div');
                ordered_text.innerHTML = "Ordered";
                ordered_container.appendChild(ordered_text);
                let ordered_date = document.createElement('div');
                ordered_date.setAttribute('class', 'shipping_range primary_eddp_font');
                ordered_date.innerHTML = ordered_formated;
                ordered_container.appendChild(ordered_date);

                let processing_container = document.createElement('div');
                processing_container.style.cssText = `flex: 1 0 33.3%; display: flex; flex-direction: column; justify-content: start; align-items: center;`;
                flexcontainer.appendChild(processing_container);
                let processing_icon = document.createElement('div');
                processing_icon.innerHTML = `<svg style="color: #000000; width: 100%; max-width: 32px;" class="svg__icon" focusable="false" viewBox="0 0 1024 1024" aria-hidden="true"><path d="M937 644.6h-22.4V493.5c0-17.8-7.1-34.8-19.7-47.4L755.1 306.3c-12.6-12.6-29.7-19.7-47.4-19.7H646v-67.1c0-37.1-30.1-67.1-67.1-67.1h-358c-37.1 0-67.1 30.1-67.1 67.1v67.1H75.4c-6.2 0-11.2 5-11.2 11.2v22.4c0 6.2 5 11.2 11.2 11.2h380.4c6.2 0 11.2 5 11.2 11.2V365c0 6.2-5 11.2-11.2 11.2H120.2c-6.2 0-11.2 5-11.2 11.2v22.4c0 6.2 5 11.2 11.2 11.2h290.9c6.2 0 11.2 5 11.2 11.2v22.4c0 6.2-5 11.2-11.2 11.2H75.4c-6.2 0-11.2 5-11.2 11.2v22.4c0 6.2 5 11.2 11.2 11.2h290.9c6.2 0 11.2 5 11.2 11.2v22.4c0 6.2-5 11.2-11.2 11.2H153.7v179c0 74.1 60.1 134.3 134.3 134.3s134.3-60.1 134.3-134.3h179c0 74.1 60.1 134.3 134.3 134.3s134.3-60.1 134.3-134.3H937c12.3 0 22.4-10.1 22.4-22.4v-45c-0.1-12.3-10.1-22.4-22.4-22.4zM288 801.3c-37.1 0-67.1-30.1-67.1-67.1 0-37.1 30.1-67.1 67.1-67.1s67.1 30.1 67.1 67.1c0 37-30 67.1-67.1 67.1z m447.6 0c-37.1 0-67.1-30.1-67.1-67.1 0-37.1 30.1-67.1 67.1-67.1s67.1 30.1 67.1 67.1c0 37-30.1 67.1-67.1 67.1z m111.8-290.9H646V353.7h61.7l139.7 139.7v17z"></path></svg>`;
                processing_container.appendChild(processing_icon);
                let processing_text = document.createElement('div');
                processing_text.innerHTML = "Shipped";
                processing_container.appendChild(processing_text);
                let processing_date = document.createElement('div');
                processing_date.setAttribute('class', 'shipping_range primary_eddp_font');
                processing_date.innerHTML = processing_formated;
                processing_container.appendChild(processing_date);

                let delivery_container = document.createElement('div');
                delivery_container.style.cssText = `flex: 1 0 33.3%; display: flex; flex-direction: column; justify-content: start; align-items: center;`;
                flexcontainer.appendChild(delivery_container);
                let delivery_icon = document.createElement('div');
                delivery_icon.innerHTML = `<svg style="color: #000000; width: 100%; max-width: 32px;" class="svg__icon" focusable="false" viewBox="0 0 1024 1024" aria-hidden="true"><path d="M497.117867 0C279.074133 0 102.4 177.152 102.4 395.605333 102.4 697.344 421.888 1024 498.346667 1024c76.526933 0 393.4208-326.724267 393.4208-628.394667C891.767467 177.152 714.9568 0 497.117867 0zm0 578.9696a181.6576 181.6576 0 0 1-181.521067-181.8624 181.6576 181.6576 0 0 1 181.521067-181.930667A181.6576 181.6576 0 0 1 678.570667 397.1072 181.6576 181.6576 0 0 1 497.117867 578.901333z"></path></svg>`;
                delivery_container.appendChild(delivery_icon);
                let delivery_text = document.createElement('div');
                delivery_text.innerHTML = "Delivered";
                delivery_container.appendChild(delivery_text);
                let delivery_date = document.createElement('div');
                delivery_date.setAttribute('class', 'shipping_range primary_eddp_font');
                delivery_date.innerHTML = date_formated;
                delivery_container.appendChild(delivery_date);
            
                shipping_title.innerHTML += function() {
                if (target_methods.type !== 'countryy') {
                    if (tm.price === '0.00' || tm.price === '0,00' || Number(tm.price) === 0) {
                        return ' / <span class="shipping_price primary_eddp_font">FREE</span>';
                    } else if (matched_country) {
                        return ` / <span class="shipping_price primary_eddp_font">${weightOnlyNoFreeRequirements.length > 1 ? "{{ 'blocks.estimated-delivery-date.text-specific-from' | t }} " + formatCurrencyPrice(tm.price) : formatCurrencyPrice(tm.price)}</span>`;
                    } else {
                        return ` / <span class="shipping_price primary_eddp_font">${formatCurrencyPrice(tm.price)}</span>`;
                    };
                } else if (target_methods.type === 'default') {
                    return '';
                }
                }();

                if (tmi === (target_methods.value.length-1)) {
                    flexcontainer.style.marginBottom = "0px";
                };
                if (matched_country) {
                    if (weightOnlyNoFreeRequirements.length > 0) addTooltip(document.querySelector('.shipping_price'),"{{ 'blocks.estimated-delivery-date.tooltip-weight-price' | t }}");
                };
            {% endif %}
        });

        document.querySelector('.free_ship_criteria').innerHTML = '';
        {% if block.settings.show_price_freeship == true %}
            if (matched_country) {
                if (target_methods.value.filter(x=>!freeShippingPriceRequirements.find(y=>y.id===x.id)).length > 0) {
                    if (freeShippingPriceRequirements.find(x=>x.min_order_subtotal && !x.max_order_subtotal)) {
                        document.querySelector('.delivery_requirements').style.display = 'block';
                        document.querySelector('.free_ship_criteria').innerHTML = formatCurrencyPrice(freeShippingPriceRequirements.find(x=>x.min_order_subtotal && !x.max_order_subtotal).min_order_subtotal)
                    } else {
                        document.querySelector('.delivery_requirements').style.display = 'none';
                    }
                }
            } else {
                document.querySelector('.delivery_requirements').style.display = 'none';
            }
        {% else %}
            document.querySelector('.delivery_requirements').style.display = 'none';
        {% endif %}
    }

    document.querySelector('.country_select').addEventListener('change',(e)=>{
        getDeliveryDate(e.target.value)
    });

    window.addEventListener('load', () =>{
        getDeliveryDate("{{ currentCountryCode }}");
        addTooltip(document.querySelector('.eddp_selected_countries_info'),"{{ 'blocks.estimated-delivery-date.tooltip-selected-countries' | t }}");
        if (document.querySelectorAll('.eddp_maincontainer').length > 1) {
            document.querySelectorAll('.eddp_maincontainer').forEach((item,index)=>{
                if (index > 0) {
                    item.style.display = 'none';
                }
            })
        }
    });    

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function addTooltip(targetEl,tooltip_text) {
        targetEl.style.cursor = 'pointer';
        targetEl.style.textDecoration = 'dotted underline 2px';

        let tooltip = document.createElement('div');
        tooltip.setAttribute('role','tooltip');
        tooltip.style.cssText = `display: none; width: max-content; position: absolute; top: 0; left: 0; background: #222; color: white; font-weight: bold; padding: 5px; border-radius: 4px; font-size: 80%;`;
        tooltip.innerText = tooltip_text;
        targetEl.parentElement.appendChild(tooltip);
        let arrowElement = document.createElement('div');
        arrowElement.style.cssText = `position: absolute; background: #222; width: 8px; height: 8px; transform: rotate(45deg);`;
        tooltip.appendChild(arrowElement);

        function update() {
            computePosition(targetEl, tooltip, {
                placement: 'top',
                middleware: [
                    offset(6),
                    flip(),
                    shift({padding: 5}),
                    arrow({element: arrowElement}),
                ],
            }).then(({x, y, placement, middlewareData}) => {
                Object.assign(tooltip.style, {
                    left: `${x}px`,
                    top: `${y}px`,
                });
                const {x: arrowX, y: arrowY} = middlewareData.arrow;

                const staticSide = {
                    top: 'bottom',
                    right: 'left',
                    bottom: 'top',
                    left: 'right',
                  }[placement.split('-')[0]];
             
                  Object.assign(arrowElement.style, {
                    left: arrowX != null ? `${arrowX}px` : '',
                    top: arrowY != null ? `${arrowY}px` : '',
                    right: '',
                    bottom: '',
                    [staticSide]: '-4px',
                  });
            });
        }

        function showTooltip() {
            tooltip.style.display = 'block';
            update();
        }

        function hideTooltip() {
            tooltip.style.display = 'none';
        }

        [
            ['mouseenter', showTooltip],
            ['mouseleave', hideTooltip],
            ['focus', showTooltip],
            ['blur', hideTooltip],
          ].forEach(([event, listener]) => {
            targetEl.addEventListener(event, listener);
          });
    }
