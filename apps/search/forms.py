from django import forms
from django.utils.translation import ugettext_lazy as _
from django.conf import settings
from utils.translation import get_languages_list

ALL_LANGUAGES = tuple((val, _(name))for val, name in settings.ALL_LANGUAGES)

class SearchForm(forms.Form):
    TYPE_CHOICES = (
        ('title', _(u'Search Title only')),
        ('full_text', _(u'Search Full Text'))
    )
    SORT_TYPE_CHOICES = (
        ('asc', _(u'Ascending')),
        ('desc', _(u'Descending'))
    )
    SORT_CHOICES = (
        ('date', _(u'Date')),
        ('sub_fetch', _(u'Subtitles fetched')),
        ('page_loads', _(u'Page loads')),
        ('comments', _(u'Comments')),
        ('languages', _(u'Most languages')),
        ('edited', _(u'Last edited')),
        ('contributors', _(u'Contributors')),
        ('activity', _(u'Activity'))
    )
    
    q = forms.CharField(required=False, label=_(u'query'))
    type = forms.ChoiceField(choices=TYPE_CHOICES, required=False, initial='full_text', 
                             label=_(u'search type'), widget=forms.RadioSelect)
    st = forms.ChoiceField(choices=SORT_TYPE_CHOICES, required=False, initial='desc', 
                           label=_(u'sort order'), widget=forms.RadioSelect)
    sort = forms.ChoiceField(choices=SORT_CHOICES, required=False, initial='sub_fetch', label=_(u'sort type'))
    langs = forms.ChoiceField(choices=ALL_LANGUAGES, required=False, label=_(u'languages'),
                                      help_text=_(u'Left blank for any language'))
    
    def __init__(self, user, default_langs, *args, **kwargs):
        super(SearchForm, self).__init__(*args, **kwargs)
        choices = list(get_languages_list())
        self.default_langs = default_langs
        choices[:0] = (
            ('my_langs', _(u'My languages')),
            ('', _(u'Any')),
        )
        self.fields['langs'].choices = choices
        self.user = user

        
    def search_qs(self, qs):
        q = self.cleaned_data.get('q')
        ordering = self.cleaned_data.get('sort') or 'page_loads'
        order_type = self.cleaned_data.get('st') or 'asc'
        langs = self.cleaned_data.get('langs')
        type = self.cleaned_data.get('type') or 'full_text'
        
        order_fields = {
            'date': 'created',
            'sub_fetch': 'subtitles_fetched_count',
            'page_loads': 'widget_views_count',
            'comments': 'comments_count',
            'languages': 'languages_count',
            'contributors': 'contributors_count',
            'activity': 'activity_count',
            'edited': 'edited'
        }
        
        if q:
            if type == 'full_text':
                qs = qs.auto_query(q).highlight()
            else:
                qs = qs.filter(title=qs.query.clean(q))
        
        if langs:
            langs = [langs]
            if 'my_langs' in langs:
                del langs[langs.index('my_langs')]
                if self.user.is_authenticated():
                    for l in self.user.userlanguage_set.values_list('language', flat=True):
                        if not l in langs:
                            langs.append(l)
                else:
                    for l in self.default_langs:
                        if not l in langs:
                            langs.append(l)

            qs = qs.filter(languages__in=langs)

        qs = qs.order_by(('-' if order_type == 'desc' else '')+order_fields[ordering])
            
        return qs